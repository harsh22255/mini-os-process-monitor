#include "APIController.h"
#include "OSMonitorApp.h"
#include <iostream>
#include <csignal>

OSMonitorApp* g_app = nullptr;

void signal_handler(int signum) {
    std::cout << "\n[Mini OS Server] Received termination signal (" << signum << "). Shutting down..." << std::endl;
    if (g_app) {
        g_app->stop();
    }
    exit(signum);
}

int main(int argc, char* argv[]) {
    int port = 8080;
    if (argc > 1) {
        try {
            port = std::stoi(argv[1]);
        } catch (...) {
            port = 8080;
        }
    }

    std::signal(SIGINT, signal_handler);
    std::signal(SIGTERM, signal_handler);

    std::cout << "==================================================" << std::endl;
    std::cout << "  FUTURISTIC 3D MINI OS PROCESS MONITOR" << std::endl;
    std::cout << "  MONITOR. VISUALIZE. CONTROL. EXPERIENCE." << std::endl;
    std::cout << "==================================================" << std::endl;
    std::cout << "[Engine] Starting C++17 Core Simulation Engine..." << std::endl;

    OSMonitorApp app;
    g_app = &app;
    app.start();

    std::cout << "[Engine] State Machine & Multithreaded Monitor Active." << std::endl;
    std::cout << "[Network] Exposing REST API and WebSocket at port " << port << "..." << std::endl;

    APIController controller(app);
    controller.run(port);

    return 0;
}
