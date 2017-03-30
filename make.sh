#!/bin/bash

NAME=`basename "$PWD"`.package

cd source
tpm create "$NAME"
mv "$NAME" ../