const initializeSocket = (io) => {
  io.on('connection', (socket) => {
    console.log('Client connected for live tracking:', socket.id);

    socket.on('joinOrderRoom', (orderId) => {
      socket.join(orderId);
    });

    socket.on('sendLocation', (data) => {
      io.to(data.orderId).emit('updateLocation', {
        lat: data.lat,
        lng: data.lng
      });
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });
};

export default initializeSocket;