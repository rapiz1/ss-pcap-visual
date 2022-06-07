cmake_minimum_required(VERSION 3.12)
set(CMAKE_CXX_STANDARD_REQUIRED 11)
set(CMAKE_EXPORT_COMPILE_COMMANDS 1)

add_subdirectory(third-party/websocketpp-0.8.2)

# set the project name
project(pcap2ws)
file(GLOB pcap2ws_SRC CONFIGURE_DEPENDS "src/*.h" "src/*.cc")
# add the executable
add_executable(pcap2ws ${pcap2ws_SRC})

target_include_directories(pcap2ws PRIVATE third-party/websocketpp-0.8.2)
target_link_libraries(pcap2ws pcap)
target_link_libraries(pcap2ws fmt)
