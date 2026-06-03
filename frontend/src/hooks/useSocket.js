import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

export function useSocket(url, organizationId) {
  const socketRef = useRef(null);

  useEffect(() => {
    if (!organizationId) return;

    // Connect to WebSocket Server
    const socketUrl = url || 'http://localhost:5000';
    socketRef.current = io(socketUrl, {
      autoConnect: true,
      transports: ['websocket'],
    });

    socketRef.current.on('connect', () => {
      console.log('Connected to real-time notification gateway');
      // Join organization specific feed channel
      socketRef.current.emit('join_org', organizationId);
    });

    socketRef.current.on('disconnect', () => {
      console.log('Disconnected from real-time gateway');
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [url, organizationId]);

  return socketRef.current;
}

export default useSocket;
