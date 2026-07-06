// QuickSSH IPC 通道名常量 - 主进程注册与渲染进程调用必须一致

export const IpcChannel = {
  // SSH 会话
  SSH_CONNECT: 'ssh:connect',
  SSH_ENSURE_CONNECTED: 'ssh:ensureConnected',
  SSH_DATA: 'ssh:data',
  SSH_RESIZE: 'ssh:resize',
  SSH_INPUT: 'ssh:input',
  SSH_CLOSE: 'ssh:close',
  SSH_CLOSED: 'ssh:closed',
  SSH_ERROR: 'ssh:error',

  // SFTP
  SFTP_LIST: 'sftp:list',
  SFTP_STAT: 'sftp:stat',
  SFTP_READ_FILE: 'sftp:readFile',
  SFTP_WRITE_FILE: 'sftp:writeFile',
  SFTP_MKDIR: 'sftp:mkdir',
  SFTP_DELETE: 'sftp:delete',
  SFTP_RENAME: 'sftp:rename',
  SFTP_CHMOD: 'sftp:chmod',
  SFTP_DOWNLOAD: 'sftp:download',
  SFTP_UPLOAD: 'sftp:upload',
  SFTP_PROGRESS: 'sftp:progress',

  // 主机监控
  MONITOR_START: 'monitor:start',
  MONITOR_STOP: 'monitor:stop',
  MONITOR_SAMPLE: 'monitor:sample',

  // 本地终端
  LOCAL_SPAWN: 'local:spawn',
  LOCAL_DATA: 'local:data',
  LOCAL_INPUT: 'local:input',
  LOCAL_RESIZE: 'local:resize',
  LOCAL_CLOSE: 'local:close',
  LOCAL_CLOSED: 'local:closed',

  // 凭据保险箱
  CRED_LIST: 'cred:list',
  CRED_GET: 'cred:get',
  CRED_SAVE: 'cred:save',
  CRED_DELETE: 'cred:delete',

  // 自定义命令
  CMD_LIST: 'cmd:list',
  CMD_SAVE: 'cmd:save',
  CMD_DELETE: 'cmd:delete',
  HISTORY_LIST: 'history:list',
  HISTORY_ADD: 'history:add',
  HISTORY_CLEAR: 'history:clear',

  // 主题
  THEME_LIST: 'theme:list',
  THEME_GET: 'theme:get',

  // 窗口控制
  WINDOW_MINIMIZE: 'window:minimize',
  WINDOW_MAXIMIZE: 'window:maximize',
  WINDOW_CLOSE: 'window:close',
  WINDOW_IS_MAXIMIZED: 'window:isMaximized',

  // 系统锁定 (暂离保护)
  APP_LOCK: 'app:lock',
  APP_UNLOCK: 'app:unlock',
  APP_LOCKED: 'app:locked'
} as const

export type IpcChannelKey = typeof IpcChannel[keyof typeof IpcChannel]
