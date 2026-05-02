/**
 * Load testing for WebSocket connections
 * 
 * Ce script utilise le moteur WebSocket d'Artillery pour tester
 * le realtime-gateway avec des connexions WebSocket
 * 
 * Usage: artillery run websocket-load-test.yml
 */

module.exports = {
  // Générer un message de subscription
  subscribeToChannels: function (userContext, events, done) {
    const channels = ['notifications', 'users'];
    const message = JSON.stringify({
      type: 'subscribe',
      channels: channels
    });
    
    userContext.ws.send(message);
    return done();
  },

  // Générer un message de ping
  sendPing: function (userContext, events, done) {
    const message = JSON.stringify({
      type: 'ping',
      timestamp: Date.now()
    });
    
    userContext.ws.send(message);
    return done();
  },

  // Simuler une déconnexion/reconnexion
  reconnect: function (userContext, events, done) {
    // Fermer la connexion actuelle
    userContext.ws.close();
    
    // Attendre un peu avant de reconnecter
    setTimeout(() => {
      return done();
    }, 1000);
  },

  // Générer un token JWT factice pour le test
  generateToken: function (userContext, events, done) {
    const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IlRlc3QgVXNlciIsImlhdCI6MTUxNjIzOTAyMn0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
    userContext.vars.token = mockToken;
    return done();
  }
};
