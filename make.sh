#!/bin/bash

NAME=`basename "$PWD"`.package

cd source
totaljs --package "$NAME"
mv "$NAME" ../