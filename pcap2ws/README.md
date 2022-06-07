# pcap2ws

A simple websocket server that captures traffic using `libpcap` and broadcasts the data via the websocket

## How to Compile

You need library `boost`, `fmt` and `libpcap` installed before the compilation.

```bash
mkdir build
cd build
cmake ..
make
```

## How to Run

```bash
sudo ./pcap2ws
```
