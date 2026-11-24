cmake_minimum_required(VERSION 3.15)
project(MiniOSProcessMonitor VERSION 1.0.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

include_directories(
    ${CMAKE_CURRENT_SOURCE_DIR}/include
    ${CMAKE_CURRENT_SOURCE_DIR}/src
)

add_definitions(-DASIO_STANDALONE -D_WIN32_WINNT=0x0601)

set(SOURCES
    src/main.cpp
)

add_executable(mini_os_backend ${SOURCES})

if(WIN32)
    target_link_libraries(mini_os_backend PRIVATE ws2_32 mswsock psapi)
endif()
