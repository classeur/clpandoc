FROM haskell:7.10

# Start pandoc install
ENV PANDOC_VERSION "1.15.1.1"
RUN cabal update && cabal install pandoc-${PANDOC_VERSION}

RUN apt-get update -y \
  && apt-get install -y --no-install-recommends \
  	curl \
  	lmodern \
    latex-xcolor \
    texlive-latex-base \
    texlive-xetex \
    texlive-math-extra \
    texlive-latex-extra \
    texlive-fonts-extra \
    texlive-bibtex-extra \
    texlive-generic-extra \
    texlive-generic-recommended \
    fontconfig

# Start node install
RUN set -ex \
	&& for key in \
		7937DFD2AB06298B2293C3187D33FF9D0246406D \
		114F43EE0176B71C7BC219DD50A3051F888C628D \
	; do \
		gpg --keyserver ha.pool.sks-keyservers.net --recv-keys "$key"; \
	done

ENV NODE_VERSION 0.12.7
ENV NPM_VERSION 2.14.1

RUN curl -SLO "https://nodejs.org/dist/v$NODE_VERSION/node-v$NODE_VERSION-linux-x64.tar.gz" \
	&& curl -SLO "https://nodejs.org/dist/v$NODE_VERSION/SHASUMS256.txt.asc" \
	&& gpg --verify SHASUMS256.txt.asc \
	&& grep " node-v$NODE_VERSION-linux-x64.tar.gz\$" SHASUMS256.txt.asc | sha256sum -c - \
	&& tar -xzf "node-v$NODE_VERSION-linux-x64.tar.gz" -C /usr/local --strip-components=1 \
	&& rm "node-v$NODE_VERSION-linux-x64.tar.gz" SHASUMS256.txt.asc \
	&& npm install -g npm@"$NPM_VERSION" \
	&& npm cache clear

RUN mkdir -p /root/.pandoc/templates
COPY templates /root/.pandoc/templates

RUN mkdir -p /usr/src/app
COPY . /usr/src/app

WORKDIR /usr/src/app
RUN npm install
CMD [ "node", "server.js" ]

EXPOSE 3000
