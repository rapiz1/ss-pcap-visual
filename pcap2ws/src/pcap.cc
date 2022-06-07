#include "pcap.h"
#include "packet.h"

#include <cassert>
#include <iostream>
#include <pcap/pcap.h>

constexpr size_t PACKET_BUFFER_TIMEOUT_IN_MS = 50;

Capture::Capture(Pcap *pcap, const char *name) {
  this->pcap = pcap;
  handle = pcap_create(name, pcap->errbuf);
  if (!handle)
    pcap->reportAndExit("pcap_create");

  if (pcap_set_timeout(handle, PACKET_BUFFER_TIMEOUT_IN_MS))
    pcap->reportAndExit("pcap_set_timeout");

  if (pcap_activate(handle) < 0) {
    pcap_perror(handle, "pcap_activate");
    exit(-1);
  }
  linkType = pcap_datalink(handle);
  std::cerr << fmt::format("Interface {} opened. link type: {}\n", name,
                           linkType);
}

Capture::~Capture() { pcap_close(handle); }

CapturedPacket Capture::read() {
  pcap_pkthdr *header = nullptr;
  const u_char *data = nullptr;
  if (pcap_next_ex(handle, &header, &data) != 1) {
    assert(false && "pcap_next timeout or error");
  }
  return CapturedPacket(data, header, linkType);
}

void etherPrintCallback(u_char *user, const struct pcap_pkthdr *header,
                        const u_char *data) {
  std::cout << CapturedPacket(data, header, DLT_EN10MB) << std::endl;
}

void Capture::show() { pcap_loop(handle, 0, etherPrintCallback, nullptr); }

void Capture::loop(pcap_handler callback, void *user) {
  pcap_loop(handle, 0, callback, (u_char *)user);
}

Pcap::Pcap() {
  if (pcap_init(PCAP_CHAR_ENC_UTF_8, errbuf)) {
    reportAndExit("pcap_init");
  }
}

Capture Pcap::openDevice(const char *name) { return Capture(this, name); }
