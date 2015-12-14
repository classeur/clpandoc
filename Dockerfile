FROM haskell:7.10

RUN apt-get update -y \
  && apt-get install -y --no-install-recommends \
  	curl \
    wget \
    unzip \
    perl

# Install texlive
RUN curl -SLO "http://mirror.ctan.org/systems/texlive/tlnet/install-tl-unx.tar.gz" \
  && tar -xzf "install-tl-unx.tar.gz" \
  && cd install-tl-* \
  && (echo I | ./install-tl) \
  && cd .. \
  && rm -rf "install-tl*"

# Install pandoc
ENV PANDOC_VERSION "1.15.2.1"
RUN cabal update && cabal install pandoc-${PANDOC_VERSION}

# Install node
RUN set -ex \
  && for key in \
    9554F04D7259F04124DE6B476D5A82AC7E37093B \
    94AE36675C464D64BAFA68DD7434390BDBE9B9C5 \
    0034A06D9D9B0064CE8ADF6BF1747F4AD2306D93 \
    FD3A5288F042B6850C66B31F09FE44734EB7990E \
    71DCFD284A79C3B38668286BC97EC7A07EDE3FC1 \
    DD8F2338BAE7501E3DD5AC78C273792F7D83545D \
  ; do \
    gpg --keyserver ha.pool.sks-keyservers.net --recv-keys "$key"; \
  done

ENV NPM_CONFIG_LOGLEVEL warn
ENV NODE_VERSION 4.2.1

RUN curl -SLO "https://nodejs.org/dist/v$NODE_VERSION/node-v$NODE_VERSION-linux-x64.tar.gz" \
  && curl -SLO "https://nodejs.org/dist/v$NODE_VERSION/SHASUMS256.txt.asc" \
  && gpg --verify SHASUMS256.txt.asc \
  && grep " node-v$NODE_VERSION-linux-x64.tar.gz\$" SHASUMS256.txt.asc | sha256sum -c - \
  && tar -xzf "node-v$NODE_VERSION-linux-x64.tar.gz" -C /usr/local --strip-components=1 \
  && rm "node-v$NODE_VERSION-linux-x64.tar.gz" SHASUMS256.txt.asc

# install fonts
RUN curl -SLO https://github.com/google/roboto/archive/master.tar.gz \
  && tar -xzf master.tar.gz \
  && mkdir -p ~/.fonts \
  && cp roboto-master/out/RobotoTTF/*.ttf ~/.fonts/ \
  && rm -rf master.tar.gz roboto-master

RUN mkdir -p ~/.fonts \
  && cd ~/.fonts \
  && curl -SLO https://noto-website-2.storage.googleapis.com/pkgs/NotoSansCJKsc-hinted.zip \
  && unzip *.zip \
  && rm *.zip \
  && cd -

RUN curl -SLO https://github.com/nathco/Office-Code-Pro/archive/master.tar.gz \
  && tar -xzf master.tar.gz \
  && mkdir -p ~/.fonts \
  && cp Office-Code-Pro-master/Fonts/Office\ Code\ Pro/TTF/*.ttf ~/.fonts/ \
  && rm -rf master.tar.gz Office-Code-Pro-master

RUN apt-get install -y --no-install-recommends \
  fontconfig

ENV PATH /usr/local/texlive/2015/bin/x86_64-linux:$PATH

RUN mkdir -p /root/.pandoc/templates
COPY templates /root/.pandoc/templates

RUN mkdir -p /usr/src/app
COPY . /usr/src/app

WORKDIR /usr/src/app
RUN npm install
CMD [ "node", "server.js" ]

EXPOSE 3000
