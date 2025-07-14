# TypeScript Team Awareness Kit

TSTAK is a TypeScript Module for creating Team Awareness Kit ([TAK](https://tak.gov)) clients, servers & gateways. It is a complete "1:1"-ish port of the outstanding [PyTAK](https://github.com/snstac/pytak) project.

## Features

- **Same as PyTAK**

## Motivations

This project's genesis came from one single need: using _one_ language to spin up clients/servers and integrate w/ the plethora of the multiple data feeds that TAK can ingest. Since the web is _the_ prevalent platform to onboard new clients onto TAK; I desired the need to use its native language: ECMASCRIPT. Because of ECMASCRIPT type system runtime vomits, I settled on Deno (TypeScript). However, this may be subject to change as I am looking into a possible Bun solution since it _can_ compile C and spit out a binary.

## TODO

- []: Finish porting
    - [] `asyncio_dgram.py`
    - [x] `classes.py`
    - [] `client_functions.py`
    - [] `commands.py`
    - [x] `constants.py`
    - [] `crypto_functions.py`
    - [x] `functions.py`
- []: Documentation
- []: Port over [snstac's takproto](https://github.com/snstac/takproto)
    - [] `constants.py`
    - [] `delimeted_protobuf.py`
    - [] `functions.py`

## License & Copyright

Copyright LVRZ LLC https://www.lvrz.org
Copyright Sensors & Signals LLC https://www.snstac.com

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

asyncio_dgram is Copyright (c) 2019 Justin Bronder and is licensed under the MIT 
License, see pytak/asyncio_dgram/LICENSE for details.

