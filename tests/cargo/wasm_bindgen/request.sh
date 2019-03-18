#!/bin/sh

tar cvf src.tar Cargo.toml src/*

# cat src.tar | base64 -w0 > src.base64
openssl base64 -A -in src.tar -out src.base64

source=`cat src.base64`
# echo "{ \"options\": {}, \"tar\": \"$source\" }"

curl -XPOST "http://localhost:8083/cargo" --data-binary "{ \"options\": { \"buildDir\": \"main\" }, \"tar\": \"$source\" }"

rm src.tar
rm src.base64
