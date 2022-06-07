#pragma once

#include "pcap.h"

#include <cassert>
#include <cstdint>
#include <fmt/core.h>
#include <memory>
#include <string>
#include <unordered_map>

#include <arpa/inet.h>
#include <net/ethernet.h>
#include <net/if_arp.h>
#include <netinet/ether.h>
#include <netinet/if_ether.h>
#include <netinet/in.h>
#include <netinet/ip.h>
#include <netinet/ip6.h>
#include <pcap/pcap.h>
#include <sys/socket.h>

class PrintablePacket {
public:
  virtual std::string toString() const = 0;
  virtual std::string toJson() const = 0;
};

class IpPacket : public PrintablePacket {
  const iphdr *header;

public:
  IpPacket(const iphdr *hdr) : header(hdr) {}
  std::string getSrcIp() const {
    in_addr addr{header->saddr};
    return inet_ntoa(addr);
  }

  std::string getDestIp() const {
    in_addr addr{header->daddr};
    return inet_ntoa(addr);
  }

  std::string toString() const override {
    return fmt::format("ipv4 {} -> {}", getSrcIp(), getDestIp());
  }

  std::string toJson() const override {
    return fmt::format(R"({{ "type": "{}", "source": "{}", "dest": "{}" }})",
                       "ipv4", getSrcIp(), getDestIp());
  }
};

class Ipv6Packet : public PrintablePacket {
  const ip6_hdr *header;

public:
  Ipv6Packet(const ip6_hdr *hdr) : header(hdr) {}
  std::string toString() const override { return "ipv6"; }
  std::string toJson() const override {
    return fmt::format(R"({{ "type": "{}" }})", "ipv6");
  }
};

class EtherPacket : public PrintablePacket {
  const ether_header *header;

public:
  EtherPacket(const ether_header *hdr) : header(hdr) {}
  uint16_t protocol() const { return header->ether_type; }

  std::string toString() const override {
    return fmt::format("ethernet, proto {}", protocol());
  }

  std::string toJson() const override {
    return fmt::format(R"({{ "type": "{}", "proto": {} }})", "ethernet",
                       protocol());
  }
};

class ArpPacket : public PrintablePacket {
  const ether_arp *p;

  static const char *opcode2string(int16_t op) {

#define ENTRY(OPNAME)                                                          \
  { OPNAME, #OPNAME }

#if 0
// copied from net/if_arp.h
#define ARPOP_REQUEST 1   /* ARP request.  */
#define ARPOP_REPLY 2     /* ARP reply.  */
#define ARPOP_RREQUEST 3  /* RARP request.  */
#define ARPOP_RREPLY 4    /* RARP reply.  */
#define ARPOP_InREQUEST 8 /* InARP request.  */
#define ARPOP_InREPLY 9   /* InARP reply.  */
#define ARPOP_NAK 10      /* (ATM)ARP NAK.  */
#endif

    static const std::unordered_map<int16_t, const char *> mapping = {
        ENTRY(ARPOP_REQUEST), ENTRY(ARPOP_REPLY),     ENTRY(ARPOP_RREQUEST),
        ENTRY(ARPOP_RREPLY),  ENTRY(ARPOP_InREQUEST), ENTRY(ARPOP_InREPLY),
        ENTRY(ARPOP_NAK)};
    const auto it = mapping.find(op);
    return it != mapping.end() ? it->second : "";
  }

public:
  ArpPacket(const ether_arp *p) : p(p) {}
  uint16_t opcode() const { return ntohs(p->ea_hdr.ar_op); }

  std::string toString() const override {
    std::string result = "arp";
    auto op = opcode();
    const char *opname = nullptr;
    if ((opname = opcode2string(op))) {
      result += fmt::format(", op {}", opname);
    } else {
      result += fmt::format(", op {}", op);
    }
    return result;
  }

  std::string toJson() const override {
    return fmt::format(R"({{ "type": "{}", "op": {} }})", "arp", opcode());
  }
};

class CapturedPacket : public PrintablePacket {
protected:
  const u_char *data;
  const pcap_pkthdr *header;
  LinkType linkType;

  size_t getLinkHeaderLength() const {
    if (linkType == DLT_EN10MB) {
      return sizeof(ether_header);
    } else if (linkType == DLT_NULL) {
      return 4;
    }
    assert(false && "Unsupported link type");
  }

  const u_char *payload() const { return data + getLinkHeaderLength(); }

  EtherPacket getEtherPacket() const {
    assert(linkType == DLT_EN10MB);
    return EtherPacket((ether_header *)data);
  }

  std::shared_ptr<PrintablePacket> getUpperPacket() const {
    const auto proto = getEtherPacket().protocol();
    if (proto == ntohs(ETHERTYPE_IP)) {
      return std::make_shared<IpPacket>((iphdr *)payload());
    } else if (proto == ntohs(ETHERTYPE_IPV6)) {
      return std::make_shared<Ipv6Packet>((ip6_hdr *)payload());
    } else if (proto == ntohs(ETHERTYPE_ARP)) {
      return std::make_shared<ArpPacket>((ether_arp *)payload());
    } else {
      return std::make_shared<EtherPacket>((ether_header *)data);
    }
  }

public:
  CapturedPacket(const u_char *data, const pcap_pkthdr *header,
                 LinkType linkType)
      : data(data), header(header), linkType(linkType) {
    assert(linkType == DLT_EN10MB &&
           "Only `LINKTYPE_ETHERNET` is supported for now");
  };

  size_t size() const { return header->len; }

  std::string toString() const override {
    const auto packet = getUpperPacket();

    auto timestamp = std::string(ctime(getTimestamp()));
    timestamp.pop_back();

    return fmt::format("{}: {}", timestamp, packet->toString());
  }

  std::string toJson() const override {
    const auto packet = getUpperPacket();

    return fmt::format(R"({{ "time":{}, "transport":{}, "size":{} }})",
                       getTimestampInMs(), packet->toJson(), size());
  }

  const time_t *getTimestamp() const { return &header->ts.tv_sec; }
  const unsigned long long getTimestampInMs() const {
    return header->ts.tv_sec * 1000ULL + header->ts.tv_usec / 1000;
  }
};

inline std::ostream &operator<<(std::ostream &out,
                                const CapturedPacket &packet) {
  return out << packet.toString();
}
