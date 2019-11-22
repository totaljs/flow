ECHO OFF
SETLOCAL ENABLEEXTENSIONS
SET parent=%~dp0
SET name=flow.package

cd source
totaljs --package %parent%%name%
MOVE %name% ../