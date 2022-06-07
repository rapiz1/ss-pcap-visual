#pragma once

#include <websocketpp/config/asio_no_tls.hpp>
#include <websocketpp/server.hpp>

#include <boost/thread/mutex.hpp>

#include <iostream>
#include <set>

typedef websocketpp::server<websocketpp::config::asio> WsServer;

using websocketpp::connection_hdl;

class Server {
private:
  typedef std::set<connection_hdl, std::owner_less<connection_hdl>> connList;

  WsServer mWsServer;

  connList mConnections;
  websocketpp::lib::mutex mConnectionsLock;

public:
  Server();

  void run(uint16_t port);

  void onOpen(connection_hdl hdl);

  void onClose(connection_hdl hdl);

  void broadcast(const std::string &msg);
};
