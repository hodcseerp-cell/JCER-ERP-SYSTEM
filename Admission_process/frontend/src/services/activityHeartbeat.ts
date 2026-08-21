import API from './api';

class ActivityHeartbeatService {
  private timer: any = null;
  private isRunning: boolean = false;

  public start() {
    if (this.isRunning) return;
    const token = localStorage.getItem('token');
    if (!token) return;

    this.isRunning = true;
    // Initial ping
    this.ping();

    // Set 60-second periodic heartbeat
    this.timer = setInterval(() => {
      this.ping();
    }, 60000);
  }

  public stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.isRunning = false;
  }

  private async ping() {
    const token = localStorage.getItem('token');
    if (!token) {
      this.stop();
      return;
    }

    try {
      await API.post('/auth/activity', {});
    } catch (err: any) {
      if (err.response?.status === 401) {
        this.stop();
      }
    }
  }
}

export const activityHeartbeat = new ActivityHeartbeatService();
export default activityHeartbeat;
