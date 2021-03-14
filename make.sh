#!/bin/bash

NAME=`basename "$PWD"`.package

cd source
total4 --package "$NAME"
mv "$NAME" ../