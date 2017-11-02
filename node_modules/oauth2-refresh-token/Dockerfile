FROM node:6

ENV NPM_CONFIG_LOGLEVEL warn

ADD ./package.json /code/package.json
WORKDIR /code
RUN npm install
ADD . /code
