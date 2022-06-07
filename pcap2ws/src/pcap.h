#pragma once
#include <iostream>
#include <string>

#include <pcap/pcap.h>

using LinkType = int;

class CapturedPacket;
class Pcap;
class Capture {
  Pcap *pcap;
  pcap_t *handle;
  LinkType linkType;

public:
  Capture(Pcap *pcap, const char *name);
  ~Capture();

  CapturedPacket read();

  void show();
  void loop(pcap_handler callback, void *user);
};

class Pcap {
  // pcap error message helpers
  char errbuf[PCAP_ERRBUF_SIZE] = "";
  std::string getErrorMessage(const std::string &name) {
    return name + ": " + errbuf;
  }
  void reportAndExit(const std::string &err) {
    std::cerr << err;
    exit(-1);
  }

public:
  Pcap();

  Capture openDevice(const char *name);
  friend class Capture;
};
