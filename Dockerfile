# Copyright (C) 2017-2022 BinaryMist Limited. All rights reserved.

# Use of this software is governed by the Business Source License
# included in the file /licenses/bsl.md

# As of the Change Date specified in that file, in accordance with
# the Business Source License, use of this software will be governed
# by the Apache License, Version 2.0

FROM node:17-alpine

ARG LOCAL_USER_ID
ARG LOCAL_GROUP_ID

# Create an environment variable in our image for the non-root user we want to use.
# ENV USER 1000
ENV USER app_scanner
ENV GROUP purpleteam
# Hack to get around cucumber's dependency change: https://github.com/cucumber/cucumber-js/issues/2011
ENV FORCE_COLOR 1
RUN echo user is: ${USER}, LOCAL_USER_ID is: ${LOCAL_USER_ID}, group is: ${GROUP}, LOCAL_GROUP_ID is: ${LOCAL_GROUP_ID}

# Used for testing zap access manually (usefull for cloud env).
#RUN apk update
#RUN apk add wget

#RUN apk add --no-cache git
# Following taken from: https://github.com/mhart/alpine-node/issues/48#issuecomment-430902787
RUN apk add --no-cache shadow && \
    if [ -z "`getent group $LOCAL_GROUP_ID`" ]; then \
      addgroup -S -g $LOCAL_GROUP_ID $GROUP; \
    else \
      groupmod -n $GROUP `getent group $LOCAL_GROUP_ID | cut -d: -f1`; \
    fi && \
    if [ -z "`getent passwd $LOCAL_USER_ID`" ]; then \
      adduser -S -u $LOCAL_USER_ID -G $GROUP -s /bin/sh $USER; \
    else \
      usermod -l $USER -g $LOCAL_GROUP_ID -d /home/$USER -m `getent passwd $LOCAL_USER_ID | cut -d: -f1`; \
    fi

# Useful for running commands as root in development
# RUN apk add --no-cache sudo && \
#     echo "$USER ALL=(root) NOPASSWD:ALL" > /etc/sudoers.d/$USER && \
#     chmod 0440 /etc/sudoers.d/$USER

ENV WORKDIR /usr/src/app/
ENV EMISSARY_OUTPUT_TRANSITION_DIR /usr/emissaryOutputTransition/

# Home is required for npm install. System account with no ability to login to shell
# For standard node image:
#RUN useradd --create-home --system --shell /bin/false $USER
# For node alpine:
# RUN addgroup -S $USER && adduser -S $USER -G $GROUP

RUN mkdir -p $WORKDIR && chown $USER:$GROUP -R $WORKDIR \
  && mkdir $EMISSARY_OUTPUT_TRANSITION_DIR && chown $USER:$GROUP -R $EMISSARY_OUTPUT_TRANSITION_DIR && chmod -R 770 $EMISSARY_OUTPUT_TRANSITION_DIR

#RUN cat /etc/resolv.conf
#RUN echo "" > /etc/resolv.conf
#RUN cat /etc/resolv.conf
#RUN ping dl-cdn.alpinelinux.org

#RUN apk add --no-cache --virtual .gyp python make g++
#RUN apk add --no-cache --virtual .gyp python

WORKDIR $WORKDIR
# For npm@5 or later, copy the automatically generated package-lock.json instead.
COPY package*.json $WORKDIR

# Required if posix needed, for winston-syslog-posix
#RUN apk add --no-cache --virtual .gyp python make g++

# In a cloud build, add the --cloud flag, as in:
#RUN cd $WORKDIR; npm install --cloud
RUN cd $WORKDIR && npm install

# Required if posix needed, for winston-syslog-posix
#User root
#RUN apk del .gyp python make g++
#USER $USER

# String expansion doesn't work currently: https://github.com/moby/moby/issues/35018
# COPY --chown=${USER}:GROUP . $WORKDIR
COPY --chown=app_scanner:purpleteam . $WORKDIR

# Here I used to chown and chmod as shown here: http://f1.holisticinfosecforwebdevelopers.com/chap03.html#vps-countermeasures-docker-the-default-user-is-root
# Problem is, each of these commands creates another layer of all the files modified and thus adds over 100MB to the image: https://www.datawire.io/not-engineer-running-3-5gb-docker-images/
# In a prod environment, it may? make sense to do the following, similar to the similar commented out line in the NodeGoat Dockerfile.
#RUN chmod -R g-s,o-rx /home/$USER && chmod -R o-wrx $WORKDIR

# Then all further actions including running the containers should
# be done under non-root user, unless root is actually required.
USER $USER

EXPOSE 3000

CMD ["npm", "start"]
