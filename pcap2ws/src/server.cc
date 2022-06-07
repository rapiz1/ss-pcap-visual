#include "server.h"

using websocketpp::lib::bind;
using websocketpp::lib::placeholders::_1;

using websocketpp::lib::lock_guard;
using websocketpp::lib::mutex;

Server::Server() {
  // Initialize Asio Transport
  mWsServer.init_asio();

  // Register handler callbacks
  mWsServer.set_open_handler(bind(&Server::onOpen, this, ::_1));
  mWsServer.set_close_handler(bind(&Server::onClose, this, ::_1));
}

void Server::run(uint16_t port) {
  // listen on specified port
  mWsServer.set_reuse_addr(true);
  mWsServer.listen(port);

  // Start the server accept loop
  mWsServer.start_accept();

  // Start the ASIO io_service run loop
  try {
    mWsServer.run();
  } catch (const std::exception &e) {
    std::cout << e.what() << std::endl;
  }
}

void Server::onOpen(connection_hdl hdl) {
  std::cerr << "connection opened" << std::endl;
  lock_guard<mutex> guard(mConnectionsLock);
  mConnections.insert(hdl);
}

void Server::onClose(connection_hdl hdl) {
  std::cerr << "connection closed" << std::endl;
  lock_guard<mutex> guard(mConnectionsLock);
  mConnections.erase(hdl);
}

void Server::broadcast(const std::string &msg) {
  lock_guard<mutex> guard(mConnectionsLock);
  for (const auto &conn : mConnections) {
    mWsServer.send(conn, msg, websocketpp::frame::opcode::TEXT);
  }
}
