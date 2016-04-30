FROM node:4.4

RUN apt-get update -y \
  && apt-get install -y --no-install-recommends \
  	curl \
    unzip \
    fontconfig \
  && rm -rf /var/lib/apt/lists/*

# Install texlive
RUN curl -SLO "http://mirror.ctan.org/systems/texlive/tlnet/install-tl-unx.tar.gz" \
  && tar -xzf "install-tl-unx.tar.gz" \
  && cd install-tl-* \
  && (printf "O\nD\nS\nR\nI\n" | ./install-tl) \
  && cd .. \
  && rm -rf install-tl* /usr/local/texlive/2015/texmf-dist/doc
ENV PATH /usr/local/texlive/2015/bin/x86_64-linux:$PATH

# Install pandoc
ENV PANDOC_VERSION 1.17.0.2
RUN curl -SLO "https://github.com/jgm/pandoc/releases/download/$PANDOC_VERSION/pandoc-$PANDOC_VERSION-1-amd64.deb" \
  && dpkg -i pandoc-$PANDOC_VERSION-1-amd64.deb \
  && rm pandoc-$PANDOC_VERSION-1-amd64.deb

# install fonts
RUN curl -SLO https://github.com/google/roboto/releases/download/v2.132/roboto-hinted.zip \
  && unzip roboto-hinted.zip \
  && mkdir -p ~/.fonts \
  && cp hinted/*.ttf ~/.fonts/ \
  && rm -rf roboto-hinted.zip hinted

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
  && rm -rf master.tar.gz Office-Code-Pro-master \
  && fc-cache -fv

ENV NPM_CONFIG_LOGLEVEL warn

RUN mkdir -p /root/.pandoc/templates
COPY templates /root/.pandoc/templates

RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

COPY package.json /usr/src/app/
RUN npm install
COPY . /usr/src/app

CMD [ "npm", "start" ]

EXPOSE 3000
