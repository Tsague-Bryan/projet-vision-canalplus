import { io } from "socket.io-client";
import { SOCKET_URL } from "./api";

export const createAppSocket = () =>
  io(SOCKET_URL, {
    transports: ["polling", "websocket"],
    upgrade: true,
    reconnectionDelayMax: 10000,
  });
