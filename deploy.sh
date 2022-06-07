#!/bin/bash
cd pcap-visual
yarn && yarn build
cp -r dist/* ..
git add -A
git commit -m 'chore: update gh-pages'
git push -f
