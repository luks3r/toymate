var __create = Object.create;
var __getProtoOf = Object.getPrototypeOf;
var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
function __accessProp(key) {
  return this[key];
}
var __toESMCache_node;
var __toESMCache_esm;
var __toESM = (mod, isNodeMode, target) => {
  var canCache = mod != null && typeof mod === "object";
  if (canCache) {
    var cache = isNodeMode ? __toESMCache_node ??= new WeakMap : __toESMCache_esm ??= new WeakMap;
    var cached = cache.get(mod);
    if (cached)
      return cached;
  }
  target = mod != null ? __create(__getProtoOf(mod)) : {};
  const to = isNodeMode || !mod || !mod.__esModule || !__hasOwnProp.call(mod, "default") ? __defProp(target, "default", { value: mod, enumerable: true }) : target;
  if (mod && typeof mod === "object" || typeof mod === "function") {
    for (let key of __getOwnPropNames(mod))
      if (!__hasOwnProp.call(to, key))
        __defProp(to, key, {
          get: __accessProp.bind(mod, key),
          enumerable: true
        });
  }
  if (canCache)
    cache.set(mod, to);
  return to;
};
var __commonJS = (cb, mod) => () => (mod || cb((mod = { exports: {} }).exports, mod), mod.exports);

// node_modules/eventemitter3/index.js
var require_eventemitter3 = __commonJS(function(exports, module) {
  var has = Object.prototype.hasOwnProperty;
  var prefix = "~";
  function Events() {}
  if (Object.create) {
    Events.prototype = Object.create(null);
    if (!new Events().__proto__)
      prefix = false;
  }
  function EE(fn, context, once) {
    this.fn = fn;
    this.context = context;
    this.once = once || false;
  }
  function addListener(emitter, event, fn, context, once) {
    if (typeof fn !== "function") {
      throw new TypeError("The listener must be a function");
    }
    var listener = new EE(fn, context || emitter, once), evt = prefix ? prefix + event : event;
    if (!emitter._events[evt])
      emitter._events[evt] = listener, emitter._eventsCount++;
    else if (!emitter._events[evt].fn)
      emitter._events[evt].push(listener);
    else
      emitter._events[evt] = [emitter._events[evt], listener];
    return emitter;
  }
  function clearEvent(emitter, evt) {
    if (--emitter._eventsCount === 0)
      emitter._events = new Events;
    else
      delete emitter._events[evt];
  }
  function EventEmitter() {
    this._events = new Events;
    this._eventsCount = 0;
  }
  EventEmitter.prototype.eventNames = function eventNames() {
    var names = [], events, name;
    if (this._eventsCount === 0)
      return names;
    for (name in events = this._events) {
      if (has.call(events, name))
        names.push(prefix ? name.slice(1) : name);
    }
    if (Object.getOwnPropertySymbols) {
      return names.concat(Object.getOwnPropertySymbols(events));
    }
    return names;
  };
  EventEmitter.prototype.listeners = function listeners(event) {
    var evt = prefix ? prefix + event : event, handlers = this._events[evt];
    if (!handlers)
      return [];
    if (handlers.fn)
      return [handlers.fn];
    for (var i = 0, l = handlers.length, ee = new Array(l);i < l; i++) {
      ee[i] = handlers[i].fn;
    }
    return ee;
  };
  EventEmitter.prototype.listenerCount = function listenerCount(event) {
    var evt = prefix ? prefix + event : event, listeners = this._events[evt];
    if (!listeners)
      return 0;
    if (listeners.fn)
      return 1;
    return listeners.length;
  };
  EventEmitter.prototype.emit = function emit(event, a1, a2, a3, a4, a5) {
    var evt = prefix ? prefix + event : event;
    if (!this._events[evt])
      return false;
    var listeners = this._events[evt], len = arguments.length, args, i;
    if (listeners.fn) {
      if (listeners.once)
        this.removeListener(event, listeners.fn, undefined, true);
      switch (len) {
        case 1:
          return listeners.fn.call(listeners.context), true;
        case 2:
          return listeners.fn.call(listeners.context, a1), true;
        case 3:
          return listeners.fn.call(listeners.context, a1, a2), true;
        case 4:
          return listeners.fn.call(listeners.context, a1, a2, a3), true;
        case 5:
          return listeners.fn.call(listeners.context, a1, a2, a3, a4), true;
        case 6:
          return listeners.fn.call(listeners.context, a1, a2, a3, a4, a5), true;
      }
      for (i = 1, args = new Array(len - 1);i < len; i++) {
        args[i - 1] = arguments[i];
      }
      listeners.fn.apply(listeners.context, args);
    } else {
      var length = listeners.length, j;
      for (i = 0;i < length; i++) {
        if (listeners[i].once)
          this.removeListener(event, listeners[i].fn, undefined, true);
        switch (len) {
          case 1:
            listeners[i].fn.call(listeners[i].context);
            break;
          case 2:
            listeners[i].fn.call(listeners[i].context, a1);
            break;
          case 3:
            listeners[i].fn.call(listeners[i].context, a1, a2);
            break;
          case 4:
            listeners[i].fn.call(listeners[i].context, a1, a2, a3);
            break;
          default:
            if (!args)
              for (j = 1, args = new Array(len - 1);j < len; j++) {
                args[j - 1] = arguments[j];
              }
            listeners[i].fn.apply(listeners[i].context, args);
        }
      }
    }
    return true;
  };
  EventEmitter.prototype.on = function on(event, fn, context) {
    return addListener(this, event, fn, context, false);
  };
  EventEmitter.prototype.once = function once(event, fn, context) {
    return addListener(this, event, fn, context, true);
  };
  EventEmitter.prototype.removeListener = function removeListener(event, fn, context, once) {
    var evt = prefix ? prefix + event : event;
    if (!this._events[evt])
      return this;
    if (!fn) {
      clearEvent(this, evt);
      return this;
    }
    var listeners = this._events[evt];
    if (listeners.fn) {
      if (listeners.fn === fn && (!once || listeners.once) && (!context || listeners.context === context)) {
        clearEvent(this, evt);
      }
    } else {
      for (var i = 0, events = [], length = listeners.length;i < length; i++) {
        if (listeners[i].fn !== fn || once && !listeners[i].once || context && listeners[i].context !== context) {
          events.push(listeners[i]);
        }
      }
      if (events.length)
        this._events[evt] = events.length === 1 ? events[0] : events;
      else
        clearEvent(this, evt);
    }
    return this;
  };
  EventEmitter.prototype.removeAllListeners = function removeAllListeners(event) {
    var evt;
    if (event) {
      evt = prefix ? prefix + event : event;
      if (this._events[evt])
        clearEvent(this, evt);
    } else {
      this._events = new Events;
      this._eventsCount = 0;
    }
    return this;
  };
  EventEmitter.prototype.off = EventEmitter.prototype.removeListener;
  EventEmitter.prototype.addListener = EventEmitter.prototype.on;
  EventEmitter.prefixed = prefix;
  EventEmitter.EventEmitter = EventEmitter;
  if (typeof module !== "undefined") {
    module.exports = EventEmitter;
  }
});

// node_modules/buttplug/dist/main/core/Logging.js
var require_Logging = __commonJS(function(exports) {
  /*!
   * Buttplug JS Source Code File - Visit https://buttplug.io for more info about
   * the project. Licensed under the BSD 3-Clause license. See LICENSE file in the
   * project root for full license information.
   *
   * @copyright Copyright (c) Nonpolynomial Labs LLC. All rights reserved.
   */
  Object.defineProperty(exports, "__esModule", { value: true });
  exports.ButtplugLogger = exports.LogMessage = exports.ButtplugLogLevel = undefined;
  var eventemitter3_1 = require_eventemitter3();
  var ButtplugLogLevel;
  (function(ButtplugLogLevel) {
    ButtplugLogLevel[ButtplugLogLevel["Off"] = 0] = "Off";
    ButtplugLogLevel[ButtplugLogLevel["Error"] = 1] = "Error";
    ButtplugLogLevel[ButtplugLogLevel["Warn"] = 2] = "Warn";
    ButtplugLogLevel[ButtplugLogLevel["Info"] = 3] = "Info";
    ButtplugLogLevel[ButtplugLogLevel["Debug"] = 4] = "Debug";
    ButtplugLogLevel[ButtplugLogLevel["Trace"] = 5] = "Trace";
  })(ButtplugLogLevel || (exports.ButtplugLogLevel = ButtplugLogLevel = {}));

  class LogMessage {
    timestamp;
    logMessage;
    logLevel;
    constructor(logMessage, logLevel) {
      const a = new Date;
      const hour = a.getHours();
      const min = a.getMinutes();
      const sec = a.getSeconds();
      this.timestamp = `${hour}:${min}:${sec}`;
      this.logMessage = logMessage;
      this.logLevel = logLevel;
    }
    get Message() {
      return this.logMessage;
    }
    get LogLevel() {
      return this.logLevel;
    }
    get Timestamp() {
      return this.timestamp;
    }
    get FormattedMessage() {
      return `${ButtplugLogLevel[this.logLevel]} : ${this.timestamp} : ${this.logMessage}`;
    }
  }
  exports.LogMessage = LogMessage;

  class ButtplugLogger extends eventemitter3_1.EventEmitter {
    static sLogger = undefined;
    maximumConsoleLogLevel = ButtplugLogLevel.Off;
    maximumEventLogLevel = ButtplugLogLevel.Off;
    static get Logger() {
      if (ButtplugLogger.sLogger === undefined) {
        ButtplugLogger.sLogger = new ButtplugLogger;
      }
      return this.sLogger;
    }
    constructor() {
      super();
    }
    get MaximumConsoleLogLevel() {
      return this.maximumConsoleLogLevel;
    }
    set MaximumConsoleLogLevel(buttplugLogLevel) {
      this.maximumConsoleLogLevel = buttplugLogLevel;
    }
    get MaximumEventLogLevel() {
      return this.maximumEventLogLevel;
    }
    set MaximumEventLogLevel(logLevel) {
      this.maximumEventLogLevel = logLevel;
    }
    Error(msg) {
      this.AddLogMessage(msg, ButtplugLogLevel.Error);
    }
    Warn(msg) {
      this.AddLogMessage(msg, ButtplugLogLevel.Warn);
    }
    Info(msg) {
      this.AddLogMessage(msg, ButtplugLogLevel.Info);
    }
    Debug(msg) {
      this.AddLogMessage(msg, ButtplugLogLevel.Debug);
    }
    Trace(msg) {
      this.AddLogMessage(msg, ButtplugLogLevel.Trace);
    }
    AddLogMessage(msg, level) {
      if (level > this.maximumEventLogLevel && level > this.maximumConsoleLogLevel) {
        return;
      }
      const logMsg = new LogMessage(msg, level);
      if (level <= this.maximumConsoleLogLevel) {
        console.log(logMsg.FormattedMessage);
      }
      if (level <= this.maximumEventLogLevel) {
        this.emit("log", logMsg);
      }
    }
  }
  exports.ButtplugLogger = ButtplugLogger;
});

// node_modules/buttplug/dist/main/core/Exceptions.js
var require_Exceptions = __commonJS(function(exports) {
  /*!
   * Buttplug JS Source Code File - Visit https://buttplug.io for more info about
   * the project. Licensed under the BSD 3-Clause license. See LICENSE file in the
   * project root for full license information.
   *
   * @copyright Copyright (c) Nonpolynomial Labs LLC. All rights reserved.
   */
  var __createBinding = exports && exports.__createBinding || (Object.create ? function(o, m, k, k2) {
    if (k2 === undefined)
      k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() {
        return m[k];
      } };
    }
    Object.defineProperty(o, k2, desc);
  } : function(o, m, k, k2) {
    if (k2 === undefined)
      k2 = k;
    o[k2] = m[k];
  });
  var __setModuleDefault = exports && exports.__setModuleDefault || (Object.create ? function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
  } : function(o, v) {
    o["default"] = v;
  });
  var __importStar = exports && exports.__importStar || function() {
    var ownKeys = function(o) {
      ownKeys = Object.getOwnPropertyNames || function(o) {
        var ar = [];
        for (var k in o)
          if (Object.prototype.hasOwnProperty.call(o, k))
            ar[ar.length] = k;
        return ar;
      };
      return ownKeys(o);
    };
    return function(mod) {
      if (mod && mod.__esModule)
        return mod;
      var result = {};
      if (mod != null) {
        for (var k = ownKeys(mod), i = 0;i < k.length; i++)
          if (k[i] !== "default")
            __createBinding(result, mod, k[i]);
      }
      __setModuleDefault(result, mod);
      return result;
    };
  }();
  Object.defineProperty(exports, "__esModule", { value: true });
  exports.ButtplugUnknownError = exports.ButtplugPingError = exports.ButtplugMessageError = exports.ButtplugDeviceError = exports.ButtplugInitError = exports.ButtplugError = undefined;
  var Messages = __importStar(require_Messages());

  class ButtplugError extends Error {
    get ErrorClass() {
      return this._errorClass;
    }
    get InnerError() {
      return this._innerError;
    }
    get Id() {
      return this._messageId;
    }
    get ErrorMessage() {
      return {
        Error: {
          Id: this.Id,
          ErrorCode: this.ErrorClass,
          ErrorMessage: this.message
        }
      };
    }
    static LogAndError(constructor, logger, message, id = Messages.SYSTEM_MESSAGE_ID) {
      logger.Error(message);
      return new constructor(message, id);
    }
    static FromError(error) {
      switch (error.ErrorCode) {
        case Messages.ErrorClass.ERROR_DEVICE:
          return new ButtplugDeviceError(error.ErrorMessage, error.Id);
        case Messages.ErrorClass.ERROR_INIT:
          return new ButtplugInitError(error.ErrorMessage, error.Id);
        case Messages.ErrorClass.ERROR_UNKNOWN:
          return new ButtplugUnknownError(error.ErrorMessage, error.Id);
        case Messages.ErrorClass.ERROR_PING:
          return new ButtplugPingError(error.ErrorMessage, error.Id);
        case Messages.ErrorClass.ERROR_MSG:
          return new ButtplugMessageError(error.ErrorMessage, error.Id);
        default:
          throw new Error(`Message type ${error.ErrorCode} not handled`);
      }
    }
    _errorClass;
    _innerError;
    _messageId;
    constructor(message, errorClass, id = Messages.SYSTEM_MESSAGE_ID, inner) {
      super(message);
      this._errorClass = errorClass;
      this._innerError = inner;
      this._messageId = id;
    }
  }
  exports.ButtplugError = ButtplugError;

  class ButtplugInitError extends ButtplugError {
    constructor(message, id = Messages.SYSTEM_MESSAGE_ID) {
      super(message, Messages.ErrorClass.ERROR_INIT, id);
    }
  }
  exports.ButtplugInitError = ButtplugInitError;

  class ButtplugDeviceError extends ButtplugError {
    constructor(message, id = Messages.SYSTEM_MESSAGE_ID) {
      super(message, Messages.ErrorClass.ERROR_DEVICE, id);
    }
  }
  exports.ButtplugDeviceError = ButtplugDeviceError;

  class ButtplugMessageError extends ButtplugError {
    constructor(message, id = Messages.SYSTEM_MESSAGE_ID) {
      super(message, Messages.ErrorClass.ERROR_MSG, id);
    }
  }
  exports.ButtplugMessageError = ButtplugMessageError;

  class ButtplugPingError extends ButtplugError {
    constructor(message, id = Messages.SYSTEM_MESSAGE_ID) {
      super(message, Messages.ErrorClass.ERROR_PING, id);
    }
  }
  exports.ButtplugPingError = ButtplugPingError;

  class ButtplugUnknownError extends ButtplugError {
    constructor(message, id = Messages.SYSTEM_MESSAGE_ID) {
      super(message, Messages.ErrorClass.ERROR_UNKNOWN, id);
    }
  }
  exports.ButtplugUnknownError = ButtplugUnknownError;
});

// node_modules/buttplug/dist/main/core/Messages.js
var require_Messages = __commonJS(function(exports) {
  /*!
   * Buttplug JS Source Code File - Visit https://buttplug.io for more info about
   * the project. Licensed under the BSD 3-Clause license. See LICENSE file in the
   * project root for full license information.
   *
   * @copyright Copyright (c) Nonpolynomial Labs LLC. All rights reserved.
   */
  Object.defineProperty(exports, "__esModule", { value: true });
  exports.InputCommandType = exports.InputType = exports.OutputType = exports.ErrorClass = exports.MESSAGE_SPEC_VERSION_MINOR = exports.MESSAGE_SPEC_VERSION_MAJOR = exports.MAX_ID = exports.DEFAULT_MESSAGE_ID = exports.SYSTEM_MESSAGE_ID = undefined;
  exports.msgId = msgId;
  exports.setMsgId = setMsgId;
  var Exceptions_1 = require_Exceptions();
  exports.SYSTEM_MESSAGE_ID = 0;
  exports.DEFAULT_MESSAGE_ID = 1;
  exports.MAX_ID = 4294967295;
  exports.MESSAGE_SPEC_VERSION_MAJOR = 4;
  exports.MESSAGE_SPEC_VERSION_MINOR = 0;
  function msgId(msg) {
    for (let [_, entry] of Object.entries(msg)) {
      if (entry != null) {
        return entry.Id;
      }
    }
    throw new Exceptions_1.ButtplugMessageError(`Message ${msg} does not have an ID.`);
  }
  function setMsgId(msg, id) {
    for (let [_, entry] of Object.entries(msg)) {
      if (entry != null) {
        entry.Id = id;
        return;
      }
    }
    throw new Exceptions_1.ButtplugMessageError(`Message ${msg} does not have an ID.`);
  }
  var ErrorClass;
  (function(ErrorClass) {
    ErrorClass[ErrorClass["ERROR_UNKNOWN"] = 0] = "ERROR_UNKNOWN";
    ErrorClass[ErrorClass["ERROR_INIT"] = 1] = "ERROR_INIT";
    ErrorClass[ErrorClass["ERROR_PING"] = 2] = "ERROR_PING";
    ErrorClass[ErrorClass["ERROR_MSG"] = 3] = "ERROR_MSG";
    ErrorClass[ErrorClass["ERROR_DEVICE"] = 4] = "ERROR_DEVICE";
  })(ErrorClass || (exports.ErrorClass = ErrorClass = {}));
  var OutputType;
  (function(OutputType) {
    OutputType["Unknown"] = "Unknown";
    OutputType["Vibrate"] = "Vibrate";
    OutputType["Rotate"] = "Rotate";
    OutputType["Oscillate"] = "Oscillate";
    OutputType["Constrict"] = "Constrict";
    OutputType["Inflate"] = "Inflate";
    OutputType["Position"] = "Position";
    OutputType["HwPositionWithDuration"] = "HwPositionWithDuration";
    OutputType["Temperature"] = "Temperature";
    OutputType["Spray"] = "Spray";
    OutputType["Led"] = "Led";
  })(OutputType || (exports.OutputType = OutputType = {}));
  var InputType;
  (function(InputType) {
    InputType["Unknown"] = "Unknown";
    InputType["Battery"] = "Battery";
    InputType["RSSI"] = "RSSI";
    InputType["Button"] = "Button";
    InputType["Pressure"] = "Pressure";
  })(InputType || (exports.InputType = InputType = {}));
  var InputCommandType;
  (function(InputCommandType) {
    InputCommandType["Read"] = "Read";
    InputCommandType["Subscribe"] = "Subscribe";
    InputCommandType["Unsubscribe"] = "Unsubscribe";
  })(InputCommandType || (exports.InputCommandType = InputCommandType = {}));
});

// node_modules/buttplug/dist/main/client/ButtplugClientDeviceFeature.js
var require_ButtplugClientDeviceFeature = __commonJS(function(exports) {
  var __createBinding = exports && exports.__createBinding || (Object.create ? function(o, m, k, k2) {
    if (k2 === undefined)
      k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() {
        return m[k];
      } };
    }
    Object.defineProperty(o, k2, desc);
  } : function(o, m, k, k2) {
    if (k2 === undefined)
      k2 = k;
    o[k2] = m[k];
  });
  var __setModuleDefault = exports && exports.__setModuleDefault || (Object.create ? function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
  } : function(o, v) {
    o["default"] = v;
  });
  var __importStar = exports && exports.__importStar || function() {
    var ownKeys = function(o) {
      ownKeys = Object.getOwnPropertyNames || function(o) {
        var ar = [];
        for (var k in o)
          if (Object.prototype.hasOwnProperty.call(o, k))
            ar[ar.length] = k;
        return ar;
      };
      return ownKeys(o);
    };
    return function(mod) {
      if (mod && mod.__esModule)
        return mod;
      var result = {};
      if (mod != null) {
        for (var k = ownKeys(mod), i = 0;i < k.length; i++)
          if (k[i] !== "default")
            __createBinding(result, mod, k[i]);
      }
      __setModuleDefault(result, mod);
      return result;
    };
  }();
  Object.defineProperty(exports, "__esModule", { value: true });
  exports.ButtplugClientDeviceFeature = undefined;
  var Exceptions_1 = require_Exceptions();
  var Messages = __importStar(require_Messages());
  var eventemitter3_1 = require_eventemitter3();

  class ButtplugClientDeviceFeature extends eventemitter3_1.EventEmitter {
    _device;
    _feature;
    _sendClosure;
    constructor(_device, _feature, _sendClosure) {
      super();
      this._device = _device;
      this._feature = _feature;
      this._sendClosure = _sendClosure;
    }
    send = async (msg) => {
      return await this._sendClosure(msg);
    };
    sendMsgExpectOk = async (msg) => {
      const response = await this.send(msg);
      if (response.Ok !== undefined) {
        return;
      } else if (response.Error !== undefined) {
        throw Exceptions_1.ButtplugError.FromError(response);
      } else {
        throw new Exceptions_1.ButtplugMessageError("Expected Ok or Error, and didn't get either!");
      }
    };
    isOutputValid(type) {
      if (this._feature.Output !== undefined && !this._feature.Output.hasOwnProperty(type)) {
        throw new Exceptions_1.ButtplugDeviceError(`Feature index ${this._feature.FeatureIndex} does not support type ${type} for device ${this._device.name}`);
      }
    }
    isInputValid(type) {
      if (this._feature.Input !== undefined && !this._feature.Input.hasOwnProperty(type)) {
        throw new Exceptions_1.ButtplugDeviceError(`Feature index ${this._feature.FeatureIndex} does not support type ${type} for device ${this._device.name}`);
      }
    }
    valueRange(value) {
      return Object.freeze([value[0], value[1]]);
    }
    createOutputInfo(type, output) {
      const durationRange = Array.isArray(output.Duration) ? this.valueRange(output.Duration) : undefined;
      return Object.freeze({
        type,
        valueRange: this.valueRange(output.Value),
        ...durationRange === undefined ? {} : { durationRange }
      });
    }
    createInputInfo(type, input) {
      return Object.freeze({
        type,
        valueRange: this.valueRange(input.Value),
        commands: Object.freeze([...input.Command])
      });
    }
    async sendOutputCmd(command) {
      this.isOutputValid(command.outputType);
      let type = command.outputType;
      const outputAttributes = this._feature.Output[type];
      let duration = undefined;
      if (type == Messages.OutputType.HwPositionWithDuration) {
        if (command.duration === undefined) {
          throw new Exceptions_1.ButtplugDeviceError("PositionWithDuration requires duration defined");
        }
        duration = command.duration;
        if (outputAttributes.Duration !== undefined && (duration < outputAttributes.Duration[0] || duration > outputAttributes.Duration[1])) {
          throw new Exceptions_1.ButtplugDeviceError(`Duration value ${duration} is not in the range ${outputAttributes.Duration[0]} <= x <= ${outputAttributes.Duration[1]}`);
        }
      }
      let value;
      const [min, max] = outputAttributes.Value;
      if (command.percent === undefined) {
        if (command.value === undefined) {
          throw new Exceptions_1.ButtplugDeviceError(`${command.outputType} requires value defined`);
        }
        value = command.value;
      } else {
        value = Math.ceil(min + (max - min) * command.percent);
      }
      if (value < min || value > max) {
        throw new Exceptions_1.ButtplugDeviceError(`${command.outputType} value ${value} is not in the range ${min} <= x <= ${max}`);
      }
      let newCommand = { Value: value, Duration: duration };
      let outCommand = {};
      outCommand[type.toString()] = newCommand;
      let cmd = {
        OutputCmd: {
          Id: 1,
          DeviceIndex: this._device.index,
          FeatureIndex: this._feature.FeatureIndex,
          Command: outCommand
        }
      };
      await this.sendMsgExpectOk(cmd);
    }
    get index() {
      return this._feature.FeatureIndex;
    }
    get descriptor() {
      return this._feature.FeatureDescriptor;
    }
    get featureDescriptor() {
      return this.descriptor;
    }
    get outputs() {
      let outputs = new Map;
      if (this._feature.Output !== undefined) {
        for (let [type, output] of Object.entries(this._feature.Output)) {
          outputs.set(type, this.createOutputInfo(type, output));
        }
      }
      return outputs;
    }
    get inputs() {
      let inputs = new Map;
      if (this._feature.Input !== undefined) {
        for (let [type, input] of Object.entries(this._feature.Input)) {
          inputs.set(type, this.createInputInfo(type, input));
        }
      }
      return inputs;
    }
    output(type) {
      let output = this._feature.Output?.[type];
      if (output === undefined) {
        return;
      }
      return this.createOutputInfo(type, output);
    }
    input(type) {
      let input = this._feature.Input?.[type];
      if (input === undefined) {
        return;
      }
      return this.createInputInfo(type, input);
    }
    inputReadingsFromMessage(inputReading) {
      if (inputReading.FeatureIndex !== this._feature.FeatureIndex) {
        return [];
      }
      let readings = [];
      for (let [type, reading] of Object.entries(inputReading.Reading)) {
        readings.push(Object.freeze({
          device: this._device,
          feature: this,
          inputType: type,
          value: reading.Value
        }));
      }
      return readings;
    }
    emitInputReading(inputReading) {
      const readings = this.inputReadingsFromMessage(inputReading);
      for (let reading of readings) {
        this.emit("inputreading", reading);
      }
      return readings;
    }
    hasOutput(type) {
      if (this._feature.Output !== undefined) {
        return this._feature.Output.hasOwnProperty(type.toString());
      }
      return false;
    }
    hasInput(type) {
      if (this._feature.Input !== undefined) {
        return this._feature.Input.hasOwnProperty(type.toString());
      }
      return false;
    }
    async runOutput(cmd) {
      if (this._feature.Output !== undefined && this._feature.Output.hasOwnProperty(cmd.outputType.toString())) {
        return this.sendOutputCmd(cmd);
      }
      throw new Exceptions_1.ButtplugDeviceError(`Output type ${cmd.outputType} not supported by feature.`);
    }
    async runInput(inputType, inputCommand) {
      this.isInputValid(inputType);
      let inputAttributes = this._feature.Input[inputType];
      if (inputCommand === Messages.InputCommandType.Unsubscribe && !inputAttributes.Command.includes(Messages.InputCommandType.Subscribe) && !inputAttributes.Command.includes(inputCommand)) {
        throw new Exceptions_1.ButtplugDeviceError(`${inputType} does not support command ${inputCommand}`);
      }
      let cmd = {
        InputCmd: {
          Id: 1,
          DeviceIndex: this._device.index,
          FeatureIndex: this._feature.FeatureIndex,
          Type: inputType,
          Command: inputCommand
        }
      };
      if (inputCommand == Messages.InputCommandType.Read) {
        const response = await this.send(cmd);
        if (response.InputReading !== undefined) {
          const reading = this.inputReadingsFromMessage(response.InputReading).find((x) => x.inputType === inputType);
          if (reading === undefined) {
            throw new Exceptions_1.ButtplugMessageError(`Expected ${inputType} reading, and didn't get one.`);
          }
          return reading;
        } else if (response.Error !== undefined) {
          throw Exceptions_1.ButtplugError.FromError(response);
        } else {
          throw new Exceptions_1.ButtplugMessageError("Expected InputReading or Error, and didn't get either!");
        }
      } else {
        await this.sendMsgExpectOk(cmd);
      }
    }
  }
  exports.ButtplugClientDeviceFeature = ButtplugClientDeviceFeature;
});

// node_modules/buttplug/dist/main/client/ButtplugClientDevice.js
var require_ButtplugClientDevice = __commonJS(function(exports) {
  /*!
   * Buttplug JS Source Code File - Visit https://buttplug.io for more info about
   * the project. Licensed under the BSD 3-Clause license. See LICENSE file in the
   * project root for full license information.
   *
   * @copyright Copyright (c) Nonpolynomial Labs LLC. All rights reserved.
   */
  var __createBinding = exports && exports.__createBinding || (Object.create ? function(o, m, k, k2) {
    if (k2 === undefined)
      k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() {
        return m[k];
      } };
    }
    Object.defineProperty(o, k2, desc);
  } : function(o, m, k, k2) {
    if (k2 === undefined)
      k2 = k;
    o[k2] = m[k];
  });
  var __setModuleDefault = exports && exports.__setModuleDefault || (Object.create ? function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
  } : function(o, v) {
    o["default"] = v;
  });
  var __importStar = exports && exports.__importStar || function() {
    var ownKeys = function(o) {
      ownKeys = Object.getOwnPropertyNames || function(o) {
        var ar = [];
        for (var k in o)
          if (Object.prototype.hasOwnProperty.call(o, k))
            ar[ar.length] = k;
        return ar;
      };
      return ownKeys(o);
    };
    return function(mod) {
      if (mod && mod.__esModule)
        return mod;
      var result = {};
      if (mod != null) {
        for (var k = ownKeys(mod), i = 0;i < k.length; i++)
          if (k[i] !== "default")
            __createBinding(result, mod, k[i]);
      }
      __setModuleDefault(result, mod);
      return result;
    };
  }();
  Object.defineProperty(exports, "__esModule", { value: true });
  exports.ButtplugClientDevice = undefined;
  var Messages = __importStar(require_Messages());
  var Exceptions_1 = require_Exceptions();
  var eventemitter3_1 = require_eventemitter3();
  var ButtplugClientDeviceFeature_1 = require_ButtplugClientDeviceFeature();

  class ButtplugClientDevice extends eventemitter3_1.EventEmitter {
    _deviceInfo;
    _sendClosure;
    _features;
    get name() {
      return this._deviceInfo.DeviceName;
    }
    get displayName() {
      return this._deviceInfo.DeviceDisplayName;
    }
    get index() {
      return this._deviceInfo.DeviceIndex;
    }
    get messageTimingGap() {
      return this._deviceInfo.DeviceMessageTimingGap;
    }
    get features() {
      return new Map(this._features);
    }
    static fromMsg(msg, sendClosure) {
      return new ButtplugClientDevice(msg, sendClosure);
    }
    constructor(_deviceInfo, _sendClosure) {
      super();
      this._deviceInfo = _deviceInfo;
      this._sendClosure = _sendClosure;
      this._features = new Map(Object.entries(_deviceInfo.DeviceFeatures).map(([index, v]) => [parseInt(index), new ButtplugClientDeviceFeature_1.ButtplugClientDeviceFeature(this, v, _sendClosure)]));
    }
    async send(msg) {
      return await this._sendClosure(msg);
    }
    sendMsgExpectOk = async (msg) => {
      const response = await this.send(msg);
      if (response.Ok !== undefined) {
        return;
      } else if (response.Error !== undefined) {
        throw Exceptions_1.ButtplugError.FromError(response);
      }
    };
    isOutputValid(featureIndex, type) {
      if (!this._deviceInfo.DeviceFeatures.hasOwnProperty(featureIndex)) {
        throw new Exceptions_1.ButtplugDeviceError(`Feature index ${featureIndex} does not exist for device ${this.name}`);
      }
      if (this._deviceInfo.DeviceFeatures[featureIndex].Output !== undefined && !this._deviceInfo.DeviceFeatures[featureIndex].Output.hasOwnProperty(type)) {
        throw new Exceptions_1.ButtplugDeviceError(`Feature index ${featureIndex} does not support type ${type} for device ${this.name}`);
      }
    }
    hasOutput(type) {
      return this._features.values().some((f) => f.hasOutput(type));
    }
    hasInput(type) {
      return this._features.values().some((f) => f.hasInput(type));
    }
    async runOutput(cmd) {
      let p = [];
      for (let f of this._features.values()) {
        if (f.hasOutput(cmd.outputType)) {
          p.push(f.runOutput(cmd));
        }
      }
      if (p.length == 0) {
        return Promise.reject(`No features with output type ${cmd.outputType}`);
      }
      await Promise.all(p);
    }
    async stop() {
      await this.sendMsgExpectOk({ StopCmd: { Id: 1, DeviceIndex: this.index, FeatureIndex: undefined, Inputs: true, Outputs: true } });
    }
    async battery() {
      let p = [];
      for (let f of this._features.values()) {
        if (f.hasInput(Messages.InputType.Battery)) {
          let response = await f.runInput(Messages.InputType.Battery, Messages.InputCommandType.Read);
          if (response === undefined) {
            throw new Exceptions_1.ButtplugMessageError("Got incorrect message back.");
          }
          return response.value;
        }
      }
      throw new Exceptions_1.ButtplugDeviceError(`No battery present on this device.`);
    }
    emitInputReading(inputReading) {
      const feature = this._features.get(inputReading.FeatureIndex);
      if (feature === undefined) {
        return [];
      }
      const readings = feature.emitInputReading(inputReading);
      for (let reading of readings) {
        this.emit("inputreading", reading);
      }
      return readings;
    }
    emitDisconnected() {
      this.emit("deviceremoved");
    }
  }
  exports.ButtplugClientDevice = ButtplugClientDevice;
});

// node_modules/buttplug/dist/main/utils/ButtplugMessageSorter.js
var require_ButtplugMessageSorter = __commonJS(function(exports) {
  /*!
   * Buttplug JS Source Code File - Visit https://buttplug.io for more info about
   * the project. Licensed under the BSD 3-Clause license. See LICENSE file in the
   * project root for full license information.
   *
   * @copyright Copyright (c) Nonpolynomial Labs LLC. All rights reserved.
   */
  var __createBinding = exports && exports.__createBinding || (Object.create ? function(o, m, k, k2) {
    if (k2 === undefined)
      k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() {
        return m[k];
      } };
    }
    Object.defineProperty(o, k2, desc);
  } : function(o, m, k, k2) {
    if (k2 === undefined)
      k2 = k;
    o[k2] = m[k];
  });
  var __setModuleDefault = exports && exports.__setModuleDefault || (Object.create ? function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
  } : function(o, v) {
    o["default"] = v;
  });
  var __importStar = exports && exports.__importStar || function() {
    var ownKeys = function(o) {
      ownKeys = Object.getOwnPropertyNames || function(o) {
        var ar = [];
        for (var k in o)
          if (Object.prototype.hasOwnProperty.call(o, k))
            ar[ar.length] = k;
        return ar;
      };
      return ownKeys(o);
    };
    return function(mod) {
      if (mod && mod.__esModule)
        return mod;
      var result = {};
      if (mod != null) {
        for (var k = ownKeys(mod), i = 0;i < k.length; i++)
          if (k[i] !== "default")
            __createBinding(result, mod, k[i]);
      }
      __setModuleDefault(result, mod);
      return result;
    };
  }();
  Object.defineProperty(exports, "__esModule", { value: true });
  exports.ButtplugMessageSorter = undefined;
  var Messages = __importStar(require_Messages());
  var Exceptions_1 = require_Exceptions();

  class ButtplugMessageSorter {
    _useCounter;
    _counter = 1;
    _waitingMsgs = new Map;
    constructor(_useCounter) {
      this._useCounter = _useCounter;
    }
    PrepareOutgoingMessage(msg) {
      if (this._useCounter) {
        Messages.setMsgId(msg, this._counter);
        this._counter += 1;
      }
      let res;
      let rej;
      const msgPromise = new Promise((resolve, reject) => {
        res = resolve;
        rej = reject;
      });
      this._waitingMsgs.set(Messages.msgId(msg), [res, rej]);
      return msgPromise;
    }
    ParseIncomingMessages(msgs) {
      const noMatch = [];
      for (const x of msgs) {
        let id = Messages.msgId(x);
        if (id !== Messages.SYSTEM_MESSAGE_ID && this._waitingMsgs.has(id)) {
          const [res, rej] = this._waitingMsgs.get(id);
          if (x.Error !== undefined) {
            rej(Exceptions_1.ButtplugError.FromError(x.Error));
            continue;
          }
          res(x);
          continue;
        } else {
          noMatch.push(x);
        }
      }
      return noMatch;
    }
  }
  exports.ButtplugMessageSorter = ButtplugMessageSorter;
});

// node_modules/buttplug/dist/main/client/ButtplugClientConnectorException.js
var require_ButtplugClientConnectorException = __commonJS(function(exports) {
  /*!
   * Buttplug JS Source Code File - Visit https://buttplug.io for more info about
   * the project. Licensed under the BSD 3-Clause license. See LICENSE file in the
   * project root for full license information.
   *
   * @copyright Copyright (c) Nonpolynomial Labs LLC. All rights reserved.
   */
  var __createBinding = exports && exports.__createBinding || (Object.create ? function(o, m, k, k2) {
    if (k2 === undefined)
      k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() {
        return m[k];
      } };
    }
    Object.defineProperty(o, k2, desc);
  } : function(o, m, k, k2) {
    if (k2 === undefined)
      k2 = k;
    o[k2] = m[k];
  });
  var __setModuleDefault = exports && exports.__setModuleDefault || (Object.create ? function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
  } : function(o, v) {
    o["default"] = v;
  });
  var __importStar = exports && exports.__importStar || function() {
    var ownKeys = function(o) {
      ownKeys = Object.getOwnPropertyNames || function(o) {
        var ar = [];
        for (var k in o)
          if (Object.prototype.hasOwnProperty.call(o, k))
            ar[ar.length] = k;
        return ar;
      };
      return ownKeys(o);
    };
    return function(mod) {
      if (mod && mod.__esModule)
        return mod;
      var result = {};
      if (mod != null) {
        for (var k = ownKeys(mod), i = 0;i < k.length; i++)
          if (k[i] !== "default")
            __createBinding(result, mod, k[i]);
      }
      __setModuleDefault(result, mod);
      return result;
    };
  }();
  Object.defineProperty(exports, "__esModule", { value: true });
  exports.ButtplugClientConnectorException = undefined;
  var Exceptions_1 = require_Exceptions();
  var Messages = __importStar(require_Messages());

  class ButtplugClientConnectorException extends Exceptions_1.ButtplugError {
    constructor(message) {
      super(message, Messages.ErrorClass.ERROR_UNKNOWN);
    }
  }
  exports.ButtplugClientConnectorException = ButtplugClientConnectorException;
});

// node_modules/buttplug/dist/main/client/ButtplugClient.js
var require_ButtplugClient = __commonJS(function(exports) {
  /*!
   * Buttplug JS Source Code File - Visit https://buttplug.io for more info about
   * the project. Licensed under the BSD 3-Clause license. See LICENSE file in the
   * project root for full license information.
   *
   * @copyright Copyright (c) Nonpolynomial Labs LLC. All rights reserved.
   */
  var __createBinding = exports && exports.__createBinding || (Object.create ? function(o, m, k, k2) {
    if (k2 === undefined)
      k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() {
        return m[k];
      } };
    }
    Object.defineProperty(o, k2, desc);
  } : function(o, m, k, k2) {
    if (k2 === undefined)
      k2 = k;
    o[k2] = m[k];
  });
  var __setModuleDefault = exports && exports.__setModuleDefault || (Object.create ? function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
  } : function(o, v) {
    o["default"] = v;
  });
  var __importStar = exports && exports.__importStar || function() {
    var ownKeys = function(o) {
      ownKeys = Object.getOwnPropertyNames || function(o) {
        var ar = [];
        for (var k in o)
          if (Object.prototype.hasOwnProperty.call(o, k))
            ar[ar.length] = k;
        return ar;
      };
      return ownKeys(o);
    };
    return function(mod) {
      if (mod && mod.__esModule)
        return mod;
      var result = {};
      if (mod != null) {
        for (var k = ownKeys(mod), i = 0;i < k.length; i++)
          if (k[i] !== "default")
            __createBinding(result, mod, k[i]);
      }
      __setModuleDefault(result, mod);
      return result;
    };
  }();
  Object.defineProperty(exports, "__esModule", { value: true });
  exports.ButtplugClient = undefined;
  var Logging_1 = require_Logging();
  var eventemitter3_1 = require_eventemitter3();
  var ButtplugClientDevice_1 = require_ButtplugClientDevice();
  var ButtplugMessageSorter_1 = require_ButtplugMessageSorter();
  var Messages = __importStar(require_Messages());
  var Exceptions_1 = require_Exceptions();
  var ButtplugClientConnectorException_1 = require_ButtplugClientConnectorException();

  class ButtplugClient extends eventemitter3_1.EventEmitter {
    _pingTimer = null;
    _connector = null;
    _devices = new Map;
    _clientName;
    _logger = Logging_1.ButtplugLogger.Logger;
    _isScanning = false;
    _serverInfo;
    _sorter = new ButtplugMessageSorter_1.ButtplugMessageSorter(true);
    constructor(clientName = "Generic Buttplug Client") {
      super();
      this._clientName = clientName;
      this._logger.Debug(`ButtplugClient: Client ${clientName} created.`);
    }
    get connected() {
      return this._connector !== null && this._connector.Connected;
    }
    get devices() {
      this.checkConnector();
      return new Map(this._devices);
    }
    get isScanning() {
      return this._isScanning;
    }
    get serverInfo() {
      return this._serverInfo;
    }
    connect = async (connector) => {
      this._logger.Info(`ButtplugClient: Connecting using ${connector.constructor.name}`);
      await connector.connect();
      this._connector = connector;
      this._connector.addListener("message", this.parseMessages);
      this._connector.addListener("disconnect", this.disconnectHandler);
      await this.initializeConnection();
    };
    disconnect = async () => {
      this._logger.Debug("ButtplugClient: Disconnect called");
      this._devices.clear();
      this.checkConnector();
      await this.shutdownConnection();
      await this._connector.disconnect();
      this._serverInfo = undefined;
    };
    startScanning = async () => {
      this._logger.Debug("ButtplugClient: StartScanning called");
      this._isScanning = true;
      await this.sendMsgExpectOk({ StartScanning: { Id: 1 } });
    };
    stopScanning = async () => {
      this._logger.Debug("ButtplugClient: StopScanning called");
      this._isScanning = false;
      await this.sendMsgExpectOk({ StopScanning: { Id: 1 } });
    };
    stopAllDevices = async () => {
      this._logger.Debug("ButtplugClient: StopCmd (all devices)");
      await this.sendMsgExpectOk({ StopCmd: { Id: 1, DeviceIndex: undefined, FeatureIndex: undefined, Inputs: true, Outputs: true } });
    };
    disconnectHandler = () => {
      this._logger.Info("ButtplugClient: Disconnect event receieved.");
      this.emit("disconnect");
    };
    parseMessages = (msgs) => {
      const leftoverMsgs = this._sorter.ParseIncomingMessages(msgs);
      for (const x of leftoverMsgs) {
        if (x.DeviceList !== undefined) {
          this.parseDeviceList(x.DeviceList);
          break;
        } else if (x.ScanningFinished !== undefined) {
          this._isScanning = false;
          this.emit("scanningfinished", x);
        } else if (x.InputReading !== undefined) {
          const device = this._devices.get(x.InputReading.DeviceIndex);
          if (device !== undefined) {
            for (let reading of device.emitInputReading(x.InputReading)) {
              this.emit("inputreading", reading);
            }
          }
        } else {
          console.log(`Unhandled message: ${x}`);
        }
      }
    };
    initializeConnection = async () => {
      this.checkConnector();
      const msg = await this.sendMessage({
        RequestServerInfo: {
          ClientName: this._clientName,
          Id: 1,
          ProtocolVersionMajor: Messages.MESSAGE_SPEC_VERSION_MAJOR,
          ProtocolVersionMinor: Messages.MESSAGE_SPEC_VERSION_MINOR
        }
      });
      if (msg.ServerInfo !== undefined) {
        const serverinfo = msg.ServerInfo;
        this._serverInfo = Object.freeze({
          serverName: serverinfo.ServerName,
          maxPingTime: serverinfo.MaxPingTime,
          protocolVersionMajor: serverinfo.ProtocolVersionMajor,
          protocolVersionMinor: serverinfo.ProtocolVersionMinor
        });
        this._logger.Info(`ButtplugClient: Connected to Server ${serverinfo.ServerName}`);
        const ping = serverinfo.MaxPingTime;
        if (ping > 0) {}
        await this.requestDeviceList();
        return true;
      } else if (msg.Error !== undefined) {
        await this._connector.disconnect();
        const err = msg.Error;
        throw Exceptions_1.ButtplugError.LogAndError(Exceptions_1.ButtplugInitError, this._logger, `Cannot connect to server. ${err.ErrorMessage}`);
      }
      return false;
    };
    parseDeviceList = (list) => {
      for (let [_, d] of Object.entries(list.Devices)) {
        if (!this._devices.has(d.DeviceIndex)) {
          const device = ButtplugClientDevice_1.ButtplugClientDevice.fromMsg(d, this.sendMessageClosure);
          this._logger.Debug(`ButtplugClient: Adding Device: ${device}`);
          this._devices.set(d.DeviceIndex, device);
          this.emit("deviceadded", device);
        } else {
          this._logger.Debug(`ButtplugClient: Device already added: ${d}`);
        }
      }
      for (let [index, device] of this._devices.entries()) {
        if (!list.Devices.hasOwnProperty(index.toString())) {
          this._devices.delete(index);
          this.emit("deviceremoved", device);
        }
      }
    };
    requestDeviceList = async () => {
      this.checkConnector();
      this._logger.Debug("ButtplugClient: ReceiveDeviceList called");
      const response = await this.sendMessage({
        RequestDeviceList: { Id: 1 }
      });
      this.parseDeviceList(response.DeviceList);
    };
    shutdownConnection = async () => {
      await this.stopAllDevices();
      if (this._pingTimer !== null) {
        clearInterval(this._pingTimer);
        this._pingTimer = null;
      }
    };
    async sendMessage(msg) {
      this.checkConnector();
      const p = this._sorter.PrepareOutgoingMessage(msg);
      await this._connector.send(msg);
      return await p;
    }
    checkConnector() {
      if (!this.connected) {
        throw new ButtplugClientConnectorException_1.ButtplugClientConnectorException("ButtplugClient not connected");
      }
    }
    sendMsgExpectOk = async (msg) => {
      const response = await this.sendMessage(msg);
      if (response.Ok !== undefined) {
        return;
      } else if (response.Error !== undefined) {
        throw Exceptions_1.ButtplugError.FromError(response);
      } else {
        throw Exceptions_1.ButtplugError.LogAndError(Exceptions_1.ButtplugMessageError, this._logger, `Message ${response} not handled by SendMsgExpectOk`);
      }
    };
    sendMessageClosure = async (msg) => {
      return await this.sendMessage(msg);
    };
  }
  exports.ButtplugClient = ButtplugClient;
});

// node_modules/buttplug/dist/main/utils/ButtplugBrowserWebsocketConnector.js
var require_ButtplugBrowserWebsocketConnector = __commonJS(function(exports) {
  /*!
   * Buttplug JS Source Code File - Visit https://buttplug.io for more info about
   * the project. Licensed under the BSD 3-Clause license. See LICENSE file in the
   * project root for full license information.
   *
   * @copyright Copyright (c) Nonpolynomial Labs LLC. All rights reserved.
   */
  Object.defineProperty(exports, "__esModule", { value: true });
  exports.ButtplugBrowserWebsocketConnector = undefined;
  var eventemitter3_1 = require_eventemitter3();
  var ButtplugClientConnectorException_1 = require_ButtplugClientConnectorException();

  class ButtplugBrowserWebsocketConnector extends eventemitter3_1.EventEmitter {
    _url;
    _ws;
    _websocketConstructor = null;
    constructor(_url) {
      super();
      this._url = _url;
    }
    get Connected() {
      return this._ws !== undefined;
    }
    connect = async () => {
      return new Promise((resolve, reject) => {
        const ws = new (this._websocketConstructor ?? WebSocket)(this._url);
        const onErrorCallback = (_event) => {
          reject(new ButtplugClientConnectorException_1.ButtplugClientConnectorException(`WebSocket connection failed to ${this._url}`));
        };
        const onCloseCallback = (event) => {
          reject(new ButtplugClientConnectorException_1.ButtplugClientConnectorException(event.reason || `WebSocket closed before connection to ${this._url} was established`));
        };
        ws.addEventListener("open", async () => {
          this._ws = ws;
          try {
            await this.initialize();
            this._ws.addEventListener("message", (msg) => {
              this.parseIncomingMessage(msg);
            });
            this._ws.removeEventListener("close", onCloseCallback);
            this._ws.removeEventListener("error", onErrorCallback);
            this._ws.addEventListener("close", this.disconnect);
            resolve();
          } catch (e) {
            reject(e);
          }
        });
        ws.addEventListener("error", onErrorCallback);
        ws.addEventListener("close", onCloseCallback);
      });
    };
    disconnect = async () => {
      if (!this.Connected) {
        return;
      }
      this._ws.close();
      this._ws = undefined;
      this.emit("disconnect");
    };
    sendMessage(msg) {
      if (!this.Connected) {
        throw new Error("ButtplugBrowserWebsocketConnector not connected");
      }
      this._ws.send("[" + JSON.stringify(msg) + "]");
    }
    initialize = async () => {
      return Promise.resolve();
    };
    parseIncomingMessage(event) {
      if (typeof event.data === "string") {
        const msgs = JSON.parse(event.data);
        this.emit("message", msgs);
      } else if (event.data instanceof Blob) {}
    }
    onReaderLoad(event) {
      const msgs = JSON.parse(event.target.result);
      this.emit("message", msgs);
    }
  }
  exports.ButtplugBrowserWebsocketConnector = ButtplugBrowserWebsocketConnector;
});

// node_modules/buttplug/dist/main/client/ButtplugBrowserWebsocketClientConnector.js
var require_ButtplugBrowserWebsocketClientConnector = __commonJS(function(exports) {
  /*!
   * Buttplug JS Source Code File - Visit https://buttplug.io for more info about
   * the project. Licensed under the BSD 3-Clause license. See LICENSE file in the
   * project root for full license information.
   *
   * @copyright Copyright (c) Nonpolynomial Labs LLC. All rights reserved.
   */
  Object.defineProperty(exports, "__esModule", { value: true });
  exports.ButtplugBrowserWebsocketClientConnector = undefined;
  var ButtplugBrowserWebsocketConnector_1 = require_ButtplugBrowserWebsocketConnector();

  class ButtplugBrowserWebsocketClientConnector extends ButtplugBrowserWebsocketConnector_1.ButtplugBrowserWebsocketConnector {
    send = (msg) => {
      if (!this.Connected) {
        throw new Error("ButtplugClient not connected");
      }
      this.sendMessage(msg);
    };
  }
  exports.ButtplugBrowserWebsocketClientConnector = ButtplugBrowserWebsocketClientConnector;
});

// node_modules/ws/browser.js
var require_browser = __commonJS(function(exports, module) {
  module.exports = function() {
    throw new Error("ws does not work in the browser. Browser clients must use the native " + "WebSocket object");
  };
});

// node_modules/buttplug/dist/main/client/ButtplugNodeWebsocketClientConnector.js
var require_ButtplugNodeWebsocketClientConnector = __commonJS(function(exports) {
  /*!
   * Buttplug JS Source Code File - Visit https://buttplug.io for more info about
   * the project. Licensed under the BSD 3-Clause license. See LICENSE file in the
   * project root for full license information.
   *
   * @copyright Copyright (c) Nonpolynomial Labs LLC. All rights reserved.
   */
  Object.defineProperty(exports, "__esModule", { value: true });
  exports.ButtplugNodeWebsocketClientConnector = undefined;
  var ButtplugBrowserWebsocketClientConnector_1 = require_ButtplugBrowserWebsocketClientConnector();
  var ws_1 = require_browser();

  class ButtplugNodeWebsocketClientConnector extends ButtplugBrowserWebsocketClientConnector_1.ButtplugBrowserWebsocketClientConnector {
    _websocketConstructor = ws_1.WebSocket;
  }
  exports.ButtplugNodeWebsocketClientConnector = ButtplugNodeWebsocketClientConnector;
});

// node_modules/buttplug/dist/main/client/ButtplugClientDeviceCommand.js
var require_ButtplugClientDeviceCommand = __commonJS(function(exports) {
  Object.defineProperty(exports, "__esModule", { value: true });
  exports.DeviceOutput = exports.DeviceOutputPositionWithDurationConstructor = exports.DeviceOutputValueConstructor = exports.DeviceOutputCommand = undefined;
  var Exceptions_1 = require_Exceptions();
  var Messages_1 = require_Messages();

  class PercentOrValue {
    _percent;
    _value;
    get percent() {
      return this._percent;
    }
    get value() {
      return this._value;
    }
    static createValue(value) {
      if (!Number.isFinite(value)) {
        throw new Exceptions_1.ButtplugDeviceError(`Output value ${value} is not finite`);
      }
      let v = new PercentOrValue;
      v._value = value;
      return v;
    }
    static createPercent(p) {
      if (p < 0 || p > 1) {
        throw new Exceptions_1.ButtplugDeviceError(`Percent value ${p} is not in the range 0.0 <= x <= 1.0`);
      }
      let v = new PercentOrValue;
      v._percent = p;
      return v;
    }
  }

  class DeviceOutputCommand {
    _outputType;
    _value;
    _duration;
    constructor(_outputType, _value, _duration) {
      this._outputType = _outputType;
      this._value = _value;
      this._duration = _duration;
    }
    static createValue(outputType, value, duration) {
      return new DeviceOutputCommand(outputType, PercentOrValue.createValue(value), duration);
    }
    static createPercent(outputType, percent, duration) {
      return new DeviceOutputCommand(outputType, PercentOrValue.createPercent(percent), duration);
    }
    get outputType() {
      return this._outputType;
    }
    get value() {
      return this._value.value;
    }
    get percent() {
      return this._value.percent;
    }
    get duration() {
      return this._duration;
    }
  }
  exports.DeviceOutputCommand = DeviceOutputCommand;

  class DeviceOutputValueConstructor {
    _outputType;
    constructor(_outputType) {
      this._outputType = _outputType;
    }
    value(value) {
      return DeviceOutputCommand.createValue(this._outputType, value);
    }
    steps(steps) {
      return this.value(steps);
    }
    percent(percent) {
      return DeviceOutputCommand.createPercent(this._outputType, percent);
    }
  }
  exports.DeviceOutputValueConstructor = DeviceOutputValueConstructor;

  class DeviceOutputPositionWithDurationConstructor {
    value(value, duration) {
      return DeviceOutputCommand.createValue(Messages_1.OutputType.HwPositionWithDuration, value, duration);
    }
    steps(steps, duration) {
      return this.value(steps, duration);
    }
    percent(percent, duration) {
      return DeviceOutputCommand.createPercent(Messages_1.OutputType.HwPositionWithDuration, percent, duration);
    }
  }
  exports.DeviceOutputPositionWithDurationConstructor = DeviceOutputPositionWithDurationConstructor;

  class DeviceOutput {
    constructor() {}
    static get Vibrate() {
      return new DeviceOutputValueConstructor(Messages_1.OutputType.Vibrate);
    }
    static get Rotate() {
      return new DeviceOutputValueConstructor(Messages_1.OutputType.Rotate);
    }
    static get Oscillate() {
      return new DeviceOutputValueConstructor(Messages_1.OutputType.Oscillate);
    }
    static get Constrict() {
      return new DeviceOutputValueConstructor(Messages_1.OutputType.Constrict);
    }
    static get Inflate() {
      return new DeviceOutputValueConstructor(Messages_1.OutputType.Inflate);
    }
    static get Temperature() {
      return new DeviceOutputValueConstructor(Messages_1.OutputType.Temperature);
    }
    static get Led() {
      return new DeviceOutputValueConstructor(Messages_1.OutputType.Led);
    }
    static get Spray() {
      return new DeviceOutputValueConstructor(Messages_1.OutputType.Spray);
    }
    static get Position() {
      return new DeviceOutputValueConstructor(Messages_1.OutputType.Position);
    }
    static get PositionWithDuration() {
      return new DeviceOutputPositionWithDurationConstructor;
    }
    static get HwPositionWithDuration() {
      return new DeviceOutputPositionWithDurationConstructor;
    }
  }
  exports.DeviceOutput = DeviceOutput;
});

// node_modules/buttplug/dist/main/client/IButtplugClientConnector.js
var require_IButtplugClientConnector = __commonJS(function(exports) {
  /*!
   * Buttplug JS Source Code File - Visit https://buttplug.io for more info about
   * the project. Licensed under the BSD 3-Clause license. See LICENSE file in the
   * project root for full license information.
   *
   * @copyright Copyright (c) Nonpolynomial Labs LLC. All rights reserved.
   */
  Object.defineProperty(exports, "__esModule", { value: true });
});

// node_modules/buttplug/dist/main/index.js
var require_main = __commonJS(function(exports) {
  /*!
   * Buttplug JS Source Code File - Visit https://buttplug.io for more info about
   * the project. Licensed under the BSD 3-Clause license. See LICENSE file in the
   * project root for full license information.
   *
   * @copyright Copyright (c) Nonpolynomial Labs LLC. All rights reserved.
   */
  var __createBinding = exports && exports.__createBinding || (Object.create ? function(o, m, k, k2) {
    if (k2 === undefined)
      k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() {
        return m[k];
      } };
    }
    Object.defineProperty(o, k2, desc);
  } : function(o, m, k, k2) {
    if (k2 === undefined)
      k2 = k;
    o[k2] = m[k];
  });
  var __exportStar = exports && exports.__exportStar || function(m, exports2) {
    for (var p in m)
      if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports2, p))
        __createBinding(exports2, m, p);
  };
  Object.defineProperty(exports, "__esModule", { value: true });
  __exportStar(require_ButtplugClient(), exports);
  __exportStar(require_ButtplugClientDevice(), exports);
  __exportStar(require_ButtplugBrowserWebsocketClientConnector(), exports);
  __exportStar(require_ButtplugNodeWebsocketClientConnector(), exports);
  __exportStar(require_ButtplugClientConnectorException(), exports);
  __exportStar(require_ButtplugClientDeviceCommand(), exports);
  __exportStar(require_IButtplugClientConnector(), exports);
  __exportStar(require_Messages(), exports);
  __exportStar(require_Logging(), exports);
  __exportStar(require_Exceptions(), exports);
});

// src/shared/intent.ts
var FEELS = ["steady", "pulse", "wave", "tease", "build", "throb", "random"];
var TEMPOS = ["slow", "medium", "fast"];
var ACCENTS = ["spike", "pause", "flutter"];
var ALL_ZONES = "all";
var isFeel = (value) => FEELS.includes(value);
var isTempo = (value) => TEMPOS.includes(value);
var isAccent = (value) => ACCENTS.includes(value);
function clampLevel(value, max = 100) {
  if (!Number.isFinite(value))
    return 0;
  return Math.max(0, Math.min(max, Math.round(value)));
}
function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function parseIntent(raw, zones, maxLevel = 100) {
  if (!isRecord(raw))
    return null;
  const zone = typeof raw.zone === "string" && zones.includes(raw.zone) ? raw.zone : ALL_ZONES;
  const action = raw.kind ?? raw.action;
  if (action === "stop")
    return { kind: "stop", zone };
  if (action === "accent")
    return isAccent(raw.accent) ? { kind: "accent", zone, accent: raw.accent } : null;
  if (action !== "scene" && action !== "set")
    return null;
  const intent = { kind: "scene", zone };
  if (typeof raw.level === "number" && Number.isFinite(raw.level))
    intent.level = clampLevel(raw.level, maxLevel);
  if (typeof raw.delta === "number" && Number.isFinite(raw.delta))
    intent.delta = Math.max(-100, Math.min(100, Math.round(raw.delta)));
  if (isFeel(raw.feel))
    intent.feel = raw.feel;
  if (isTempo(raw.tempo))
    intent.tempo = raw.tempo;
  if (intent.level === undefined && intent.delta === undefined && !intent.feel && !intent.tempo)
    return null;
  return intent;
}
function describeIntent(intent) {
  const where = intent.zone === ALL_ZONES ? "" : ` @${intent.zone}`;
  if (intent.kind === "stop")
    return `stop${where}`;
  if (intent.kind === "accent")
    return `${intent.accent}${where}`;
  const parts = [];
  if (intent.level !== undefined)
    parts.push(`${intent.level}`);
  if (intent.delta !== undefined)
    parts.push(`${intent.delta >= 0 ? "+" : ""}${intent.delta}`);
  if (intent.feel)
    parts.push(intent.feel);
  if (intent.tempo)
    parts.push(intent.tempo);
  return `${parts.join(" ")}${where}`;
}

// src/shared/settings.ts
var MODES = ["off", "reactive", "story"];
var isMode = (value) => MODES.includes(value);
var RULE_TRIGGERS = ["character_message", "user_message", "streaming"];
var DEFAULT_ZONE = "main";
var DEFAULT_SETTINGS = {
  version: 1,
  intifaceUrl: "ws://127.0.0.1:12345",
  autoConnect: false,
  limits: {
    maxLevel: 70,
    rampPerSecond: 60,
    holdTimeoutSec: 180,
    stopOnGenerationStop: true,
    strokeMaxSpeed: 1.5,
    strokeMin: 0,
    strokeMax: 100,
    constrictMaxHoldSec: 30,
    temperatureMax: 50,
    rotateSwapMinMs: 1500
  },
  zones: [DEFAULT_ZONE],
  outputs: {},
  rules: [],
  streamPulse: false,
  safewords: { stop: "red", ease: "yellow" },
  story: { connectionId: null, readingCps: 15, awareness: false },
  chatModes: {},
  characterModes: {}
};
var DEFAULT_OUTPUT_PREFS = { zone: DEFAULT_ZONE, floor: 0, ceiling: 70 };
function num(value, fallback, min, max) {
  return typeof value === "number" && Number.isFinite(value) ? Math.max(min, Math.min(max, value)) : fallback;
}
var bool = (value, fallback) => typeof value === "boolean" ? value : fallback;
function str(value, fallback, maxLength = 200) {
  return typeof value === "string" ? value.slice(0, maxLength) : fallback;
}
function zoneLabel(value) {
  if (typeof value !== "string")
    return null;
  const label = value.trim().toLowerCase().replace(/\s+/g, "-").slice(0, 32);
  return label && label !== "all" ? label : null;
}
function parseLimits(raw) {
  const d = DEFAULT_SETTINGS.limits;
  const r = isRecord(raw) ? raw : {};
  const strokeMin = num(r.strokeMin, d.strokeMin, 0, 100);
  return {
    maxLevel: num(r.maxLevel, d.maxLevel, 0, 100),
    rampPerSecond: num(r.rampPerSecond, d.rampPerSecond, 5, 1000),
    holdTimeoutSec: num(r.holdTimeoutSec, d.holdTimeoutSec, 10, 3600),
    stopOnGenerationStop: bool(r.stopOnGenerationStop, d.stopOnGenerationStop),
    strokeMaxSpeed: num(r.strokeMaxSpeed, d.strokeMaxSpeed, 0.1, 5),
    strokeMin,
    strokeMax: num(r.strokeMax, d.strokeMax, strokeMin, 100),
    constrictMaxHoldSec: num(r.constrictMaxHoldSec, d.constrictMaxHoldSec, 2, 600),
    temperatureMax: num(r.temperatureMax, d.temperatureMax, 0, 100),
    rotateSwapMinMs: num(r.rotateSwapMinMs, d.rotateSwapMinMs, 200, 60000)
  };
}
function parseRule(raw, zones) {
  if (!isRecord(raw))
    return null;
  const then = parseIntent(raw.then, zones);
  const when = RULE_TRIGGERS.find((t) => t === raw.when);
  if (!then || !when)
    return null;
  return {
    id: str(raw.id, crypto.randomUUID(), 64),
    enabled: bool(raw.enabled, true),
    when,
    match: str(raw.match, "", 500),
    characterId: typeof raw.characterId === "string" ? raw.characterId : null,
    then
  };
}
function parseModes(raw) {
  const out = {};
  if (!isRecord(raw))
    return out;
  for (const [id, mode] of Object.entries(raw))
    if (isMode(mode) && mode !== "off")
      out[id] = mode;
  return out;
}
function parseSettings(raw) {
  const r = isRecord(raw) ? raw : {};
  const d = DEFAULT_SETTINGS;
  const zones = [...new Set((Array.isArray(r.zones) ? r.zones : d.zones).map(zoneLabel).filter((z) => z !== null))];
  if (zones.length === 0)
    zones.push(DEFAULT_ZONE);
  const outputs = {};
  if (isRecord(r.outputs)) {
    for (const [key, value] of Object.entries(r.outputs)) {
      if (!isRecord(value))
        continue;
      const floor = num(value.floor, DEFAULT_OUTPUT_PREFS.floor, 0, 100);
      const zone = zoneLabel(value.zone);
      outputs[key.slice(0, 200)] = {
        zone: zone && zones.includes(zone) ? zone : zones[0],
        floor,
        ceiling: num(value.ceiling, DEFAULT_OUTPUT_PREFS.ceiling, floor, 100)
      };
    }
  }
  const safewords = isRecord(r.safewords) ? r.safewords : {};
  const story = isRecord(r.story) ? r.story : {};
  return {
    version: 1,
    intifaceUrl: /^wss?:\/\/\S+$/.test(String(r.intifaceUrl)) ? String(r.intifaceUrl) : d.intifaceUrl,
    autoConnect: bool(r.autoConnect, d.autoConnect),
    limits: parseLimits(r.limits),
    zones,
    outputs,
    rules: (Array.isArray(r.rules) ? r.rules : []).slice(0, 100).map((x) => parseRule(x, zones)).filter((x) => x !== null),
    streamPulse: bool(r.streamPulse, d.streamPulse),
    safewords: {
      stop: str(safewords.stop, d.safewords.stop, 40).trim().toLowerCase(),
      ease: str(safewords.ease, d.safewords.ease, 40).trim().toLowerCase()
    },
    story: {
      connectionId: typeof story.connectionId === "string" && story.connectionId ? story.connectionId : null,
      readingCps: num(story.readingCps, d.story.readingCps, 3, 100),
      awareness: bool(story.awareness, d.story.awareness)
    },
    chatModes: parseModes(r.chatModes),
    characterModes: parseModes(r.characterModes)
  };
}
function modeFor(settings, chatId, characterId) {
  return chatId && settings.chatModes[chatId] || characterId && settings.characterModes[characterId] || "off";
}
function prefsFor(settings, key) {
  return settings.outputs[key] ?? { ...DEFAULT_OUTPUT_PREFS, zone: settings.zones[0] ?? DEFAULT_ZONE };
}

// src/shared/wire.ts
function asBackendMessage(raw) {
  return isRecord(raw) && typeof raw.type === "string" ? raw : null;
}

// src/frontend/engine/adapter.ts
var import_buttplug = __toESM(require_main(), 1);

// src/frontend/engine/devices.ts
var OUTPUT_KINDS = [
  "Vibrate",
  "Rotate",
  "Oscillate",
  "Constrict",
  "Inflate",
  "HwPositionWithDuration",
  "Position",
  "Temperature",
  "Spray",
  "Led"
];
var UNDRIVEN = new Set(["Spray", "Led", "Position"]);
var NAMED_ZONE_ONLY = new Set(["Temperature"]);
function outputKey(deviceName, ordinal, featureIndex, kind) {
  return `${deviceName}${ordinal > 1 ? ` (${ordinal})` : ""}#${featureIndex}#${kind}`;
}
function sceneKeyFor(output, settings) {
  if (UNDRIVEN.has(output.kind))
    return null;
  const zone = prefsFor(settings, output.key).zone;
  return NAMED_ZONE_ONLY.has(output.kind) ? namedSceneKey(zone) : zone;
}
var namedSceneKey = (zone) => `${zone}:named`;
function describeKind(kind) {
  switch (kind) {
    case "HwPositionWithDuration":
    case "Position":
      return "stroke";
    default:
      return kind.toLowerCase();
  }
}

// src/frontend/engine/adapter.ts
var isOutputKind = (v) => OUTPUT_KINDS.includes(v);

class ButtplugAdapter {
  events;
  client = null;
  devices = [];
  byIndex = new Map;
  constructor(events) {
    this.events = events;
  }
  get connected() {
    return this.client?.connected ?? false;
  }
  list() {
    return this.devices;
  }
  async connect(url) {
    await this.disconnect();
    const client = new import_buttplug.ButtplugClient("Toymate");
    client.addListener("deviceadded", () => this.refresh());
    client.addListener("deviceremoved", () => this.refresh());
    client.addListener("scanningfinished", () => this.events.onScanningFinished());
    client.addListener("disconnect", () => {
      if (this.client !== client)
        return;
      this.client = null;
      this.refresh();
      this.events.onDisconnected();
    });
    this.client = client;
    try {
      await client.connect(new import_buttplug.ButtplugBrowserWebsocketClientConnector(url));
    } catch (error) {
      this.client = null;
      throw error;
    }
    this.refresh();
  }
  async disconnect() {
    const client = this.client;
    if (!client)
      return;
    this.client = null;
    try {
      if (client.connected) {
        await client.stopAllDevices().catch(() => {});
        await client.disconnect();
      }
    } finally {
      this.refresh();
    }
  }
  async startScanning() {
    await this.client?.startScanning();
  }
  async stopScanning() {
    await this.client?.stopScanning().catch(() => {});
  }
  async readBatteries() {
    for (const info of this.devices) {
      const device = this.byIndex.get(info.index);
      const feature = device && [...device.features.values()].find((f) => f.hasInput(import_buttplug.InputType.Battery));
      if (!feature)
        continue;
      try {
        const reading = await feature.runInput(import_buttplug.InputType.Battery, import_buttplug.InputCommandType.Read);
        const value = reading?.value ?? NaN;
        const range = feature.input(import_buttplug.InputType.Battery)?.valueRange ?? [0, 100];
        if (Number.isFinite(value))
          info.battery = Math.round((value - range[0]) / (range[1] - range[0] || 1) * 100);
      } catch {}
    }
    this.events.onDevicesChanged();
  }
  refresh() {
    const devices = this.client ? [...this.client.devices.values()].sort((a, b) => a.index - b.index) : [];
    const seen = new Map;
    const previous = new Map(this.devices.map((d) => [d.index, d.battery]));
    this.byIndex = new Map(devices.map((d) => [d.index, d]));
    this.devices = devices.map((device) => {
      const name = device.displayName || device.name;
      const ordinal = (seen.get(name) ?? 0) + 1;
      seen.set(name, ordinal);
      const outputs = [];
      for (const feature of device.features.values()) {
        const hasHwPosition = feature.hasOutput(import_buttplug.OutputType.HwPositionWithDuration);
        for (const out of feature.outputs.values()) {
          if (!isOutputKind(out.type))
            continue;
          if (out.type === "Position" && hasHwPosition)
            continue;
          outputs.push({
            key: outputKey(name, ordinal, feature.index, out.type),
            deviceIndex: device.index,
            deviceName: name,
            featureIndex: feature.index,
            kind: out.type,
            range: out.valueRange,
            ...out.durationRange ? { durationRange: out.durationRange } : {},
            timingGapMs: device.messageTimingGap ?? 100
          });
        }
      }
      return { index: device.index, name, outputs, battery: previous.get(device.index) ?? null };
    });
    this.events.onDevicesChanged();
  }
  async send(output, value, durationMs) {
    const feature = this.byIndex.get(output.deviceIndex)?.features.get(output.featureIndex);
    if (!feature)
      return;
    const [min, max] = output.range;
    const v = Math.max(min, Math.min(max, value));
    const command = output.kind === "HwPositionWithDuration" ? import_buttplug.DeviceOutput.HwPositionWithDuration.value(v, durationMs ?? 500) : import_buttplug.DeviceOutput[output.kind].value(v);
    await feature.runOutput(command);
  }
  async stopAll() {
    if (this.client?.connected)
      await this.client.stopAllDevices();
  }
}

// src/frontend/engine/director.ts
var ACCENT_MS = { spike: 1500, pause: 2000, flutter: 2000 };
var GLIDE_PER_SECOND = 80;

class Director {
  zones;
  holdTimeoutMs;
  scenes = new Map;
  locked = new Set;
  cues = [];
  lastTick = null;
  constructor(zones, holdTimeoutMs) {
    this.zones = zones;
    this.holdTimeoutMs = holdTimeoutMs;
  }
  configure(zones, holdTimeoutMs) {
    this.zones = zones;
    this.holdTimeoutMs = holdTimeoutMs;
    for (const key of [...this.scenes.keys()]) {
      if (!zones.some((z) => key === z || key === namedSceneKey(z)))
        this.scenes.delete(key);
    }
  }
  scene(key, now) {
    let s = this.scenes.get(key);
    if (!s) {
      s = { target: 0, current: 0, feel: "steady", tempo: "medium", startedAt: now, touchedAt: now, accent: null };
      this.scenes.set(key, s);
    }
    return s;
  }
  keysFor(zone) {
    if (zone === ALL_ZONES)
      return [...this.zones];
    return this.zones.includes(zone) ? [zone, namedSceneKey(zone)] : [];
  }
  apply(intent, now, source) {
    for (const key of this.keysFor(intent.zone)) {
      const zone = key.replace(/:named$/, "");
      if (source === "auto" && this.locked.has(zone))
        continue;
      const s = this.scene(key, now);
      s.touchedAt = now;
      if (intent.kind === "stop") {
        s.target = 0;
        s.current = 0;
        s.accent = null;
      } else if (intent.kind === "accent") {
        s.accent = { accent: intent.accent, until: now + ACCENT_MS[intent.accent] };
      } else {
        if (intent.level !== undefined)
          s.target = clampLevel(intent.level);
        if (intent.delta !== undefined)
          s.target = clampLevel(s.target + intent.delta);
        if (intent.feel && intent.feel !== s.feel || intent.tempo && intent.tempo !== s.tempo)
          s.startedAt = now;
        if (intent.feel)
          s.feel = intent.feel;
        if (intent.tempo)
          s.tempo = intent.tempo;
      }
    }
  }
  schedule(groupId, cues) {
    this.cues.push(...cues.map((c) => ({ ...c, groupId })));
    this.cues.sort((a, b) => a.at - b.at);
  }
  cancel(groupId) {
    this.cues = this.cues.filter((c) => c.groupId !== groupId);
  }
  pending() {
    return this.cues;
  }
  setLocked(zone, locked) {
    if (locked)
      this.locked.add(zone);
    else
      this.locked.delete(zone);
  }
  isLocked(zone) {
    return this.locked.has(zone);
  }
  stopAll(now) {
    this.cues = [];
    for (const s of this.scenes.values()) {
      s.target = 0;
      s.current = 0;
      s.accent = null;
      s.touchedAt = now;
    }
  }
  tick(now) {
    while (this.cues.length && this.cues[0].at <= now)
      this.apply(this.cues.shift().intent, now, "auto");
    const dt = this.lastTick === null ? 0 : Math.max(0, now - this.lastTick);
    this.lastTick = now;
    for (const s of this.scenes.values()) {
      if (s.target > 0 && now - s.touchedAt > this.holdTimeoutMs)
        s.target = 0;
      if (s.accent && now >= s.accent.until)
        s.accent = null;
      const step = GLIDE_PER_SECOND * dt / 1000;
      s.current = s.current < s.target ? Math.min(s.target, s.current + step) : Math.max(s.target, s.current - step);
    }
  }
  sample(key) {
    const s = this.scenes.get(key);
    if (!s)
      return null;
    switch (s.accent?.accent) {
      case "pause":
        return { level: 0, feel: s.feel, tempo: s.tempo, startedAt: s.startedAt };
      case "spike":
        return { level: Math.min(100, Math.max(s.current, 20) + 35), feel: "steady", tempo: s.tempo, startedAt: s.startedAt };
      case "flutter":
        return { level: Math.max(s.current, 30), feel: "pulse", tempo: "fast", startedAt: s.startedAt };
      default:
        return { level: s.current, feel: s.feel, tempo: s.tempo, startedAt: s.startedAt };
    }
  }
  views() {
    return this.zones.map((zone) => {
      const s = this.scenes.get(zone);
      return {
        zone,
        level: Math.round(s?.current ?? 0),
        target: s?.target ?? 0,
        feel: s?.feel ?? "steady",
        tempo: s?.tempo ?? "medium",
        accent: s?.accent?.accent ?? null,
        locked: this.locked.has(zone)
      };
    });
  }
  isActive() {
    return [...this.scenes.values()].some((s) => s.current > 0 || s.target > 0 || s.accent?.accent === "spike" || s.accent?.accent === "flutter");
  }
  summary() {
    const active = this.views().filter((v) => v.target > 0);
    if (active.length === 0)
      return "all devices idle";
    return active.map((v) => `${v.zone}: ${v.feel}, ${v.tempo}, level ${v.target}`).join("; ");
  }
}

// src/frontend/engine/governor.ts
var RELEASE_MIN_MS = 5000;

class Governor {
  sink;
  limits;
  prefs;
  onFault;
  states = new Map;
  stopped = false;
  constructor(sink, limits, prefs, onFault) {
    this.sink = sink;
    this.limits = limits;
    this.prefs = prefs;
    this.onFault = onFault;
  }
  configure(limits, prefs) {
    this.limits = limits;
    this.prefs = prefs;
  }
  retain(keys) {
    for (const key of [...this.states.keys()])
      if (!keys.has(key))
        this.states.delete(key);
  }
  state(key) {
    let s = this.states.get(key);
    if (!s) {
      s = {
        fraction: 0,
        sign: 1,
        lastSwapAt: -Infinity,
        lastTickAt: null,
        lastSent: 0,
        lastSentAt: -Infinity,
        inFlight: false,
        onSince: null,
        releaseUntil: 0,
        lastStrokeId: null,
        lastPosition: 0
      };
      this.states.set(key, s);
    }
    return s;
  }
  reset() {
    this.states.clear();
    this.stopped = false;
  }
  resume() {
    this.stopped = false;
  }
  apply(output, desired, now) {
    if (this.stopped || UNDRIVEN.has(output.kind))
      return;
    const s = this.state(output.key);
    const dt = s.lastTickAt === null ? 0 : Math.max(0, now - s.lastTickAt);
    s.lastTickAt = now;
    if (desired.kind === "stroke")
      this.applyStroke(output, s, desired.stroke, now);
    else
      this.applyValue(output, s, desired.value, now, dt);
  }
  targetFraction(output, normalized) {
    const level = Math.min(Math.abs(normalized) * 100, this.limits.maxLevel);
    if (!(level > 0))
      return 0;
    const { floor, ceiling } = this.prefs(output.key);
    let fraction = (floor + (ceiling - floor) * level / 100) / 100;
    if (output.kind === "Temperature")
      fraction = Math.min(fraction, this.limits.temperatureMax / 100);
    return Math.min(1, Math.max(0, fraction));
  }
  applyValue(output, s, normalized, now, dt) {
    const target = this.targetFraction(output, normalized);
    const maxRise = this.limits.rampPerSecond / 100 * dt / 1000;
    const wasIdle = s.fraction === 0;
    s.fraction = target > s.fraction ? Math.min(target, s.fraction + maxRise) : target;
    if (wasIdle && s.fraction > 0)
      s.lastSwapAt = now;
    if (output.kind === "Constrict" || output.kind === "Inflate") {
      if (now < s.releaseUntil)
        s.fraction = 0;
      else if (s.fraction > 0) {
        s.onSince ??= now;
        const maxHold = this.limits.constrictMaxHoldSec * 1000;
        if (now - s.onSince > maxHold) {
          s.releaseUntil = now + Math.max(RELEASE_MIN_MS, maxHold / 2);
          s.onSince = null;
          s.fraction = 0;
        }
      } else
        s.onSince = null;
    }
    if (output.kind === "Rotate") {
      const wanted = normalized < 0 ? -1 : normalized > 0 ? 1 : s.sign;
      if (wanted !== s.sign && now - s.lastSwapAt >= this.limits.rotateSwapMinMs) {
        s.sign = wanted;
        s.lastSwapAt = now;
      }
    }
    const [min, max] = output.range;
    const value = min < 0 ? Math.round(s.sign * s.fraction * max) : Math.round(min + (max - min) * s.fraction);
    this.send(output, s, value, now);
  }
  applyStroke(output, s, stroke, now) {
    if (!stroke || stroke.id === s.lastStrokeId)
      return;
    const { strokeMin, strokeMax, strokeMaxSpeed, maxLevel } = this.limits;
    const ceiling = this.prefs(output.key).ceiling;
    const position = Math.min(stroke.position, maxLevel / 100, ceiling / 100);
    const minDuration = Math.abs(position - s.lastPosition) / strokeMaxSpeed * 1000;
    let duration = Math.max(stroke.durationMs, minDuration);
    if (output.durationRange)
      duration = Math.min(Math.max(duration, output.durationRange[0]), output.durationRange[1]);
    const [min, max] = output.range;
    const lo = min + (max - min) * strokeMin / 100;
    const hi = min + (max - min) * strokeMax / 100;
    const value = Math.round(lo + (hi - lo) * position);
    if (this.send(output, s, value, now, Math.round(duration), true)) {
      s.lastStrokeId = stroke.id;
      s.lastPosition = position;
    }
  }
  send(output, s, value, now, durationMs, force = false) {
    if (!force && value === s.lastSent)
      return false;
    if (s.inFlight || now - s.lastSentAt < output.timingGapMs)
      return false;
    s.inFlight = true;
    s.lastSent = value;
    s.lastSentAt = now;
    this.sink.send(output, value, durationMs).then(() => s.inFlight = false, (error) => {
      s.inFlight = false;
      this.onFault(error);
    });
    return true;
  }
  async stopAll() {
    this.stopped = true;
    for (const s of this.states.values()) {
      s.fraction = 0;
      s.lastSent = 0;
      s.lastStrokeId = null;
      s.onSince = null;
    }
    await this.sink.stopAll();
  }
  sentValue(key) {
    return this.states.get(key)?.lastSent ?? null;
  }
}

// src/frontend/engine/renderers.ts
var PERIOD_MS = { slow: 4000, medium: 2000, fast: 900 };
var BUILD_MS = { slow: 60000, medium: 30000, fast: 15000 };
var STROKES_PER_MINUTE = { slow: 30, medium: 60, fast: 100 };
var frac = (x) => x - Math.floor(x);
function hash01(n) {
  let x = Math.imul(n ^ 2654435769, 2246822507);
  x = Math.imul(x ^ x >>> 13, 3266489909);
  return ((x ^ x >>> 16) >>> 0) / 2 ** 32;
}
function envelope(feel, tempo, now, startedAt, phase = 0) {
  const period = PERIOD_MS[tempo];
  const p = frac((now - startedAt) / period + phase);
  switch (feel) {
    case "steady":
      return 1;
    case "pulse":
      return p < 0.55 ? 1 : 0.15;
    case "wave":
      return 0.25 + 0.75 * (0.5 - 0.5 * Math.cos(2 * Math.PI * p));
    case "tease": {
      const q = frac((now - startedAt) / (period * 2) + phase);
      return q < 0.35 ? 1 : 0;
    }
    case "build":
      return 0.3 + 0.7 * Math.min(1, Math.max(0, (now - startedAt) / BUILD_MS[tempo]));
    case "throb": {
      const q = frac((now - startedAt) / (period * 1.5) + phase);
      return 0.2 + 0.8 * Math.sin(Math.PI * q) ** 4;
    }
    case "random": {
      const t = (now - startedAt) / (period / 2) + phase * 7;
      const i = Math.floor(t);
      const a = 0.3 + 0.7 * hash01(i);
      const b = 0.3 + 0.7 * hash01(i + 1);
      return a + (b - a) * frac(t);
    }
  }
}
function renderContinuous(kind, s, now, phase) {
  if (s.level <= 0)
    return 0;
  const base = s.level / 100;
  switch (kind) {
    case "Temperature":
      return base;
    case "Constrict":
    case "Inflate":
      return s.feel === "pulse" || s.feel === "throb" ? base * envelope("throb", "slow", now, s.startedAt, phase) : base;
    case "Rotate": {
      const speed = base * envelope(s.feel, s.tempo, now, s.startedAt, phase);
      const swaps = s.feel === "wave" || s.feel === "random";
      const direction = swaps && Math.floor((now - s.startedAt) / (PERIOD_MS[s.tempo] * 2)) % 2 === 1 ? -1 : 1;
      return speed * direction;
    }
    default:
      return base * envelope(s.feel, s.tempo, now, s.startedAt, phase);
  }
}
function renderStroke(s, now) {
  if (s.level <= 0)
    return null;
  let spm = STROKES_PER_MINUTE[s.tempo];
  if (s.feel === "build") {
    const t = Math.min(1, (now - s.startedAt) / BUILD_MS[s.tempo]);
    spm = STROKES_PER_MINUTE.slow + (spm - STROKES_PER_MINUTE.slow) * t;
  }
  const half = 60000 / spm / 2;
  const id = Math.floor((now - s.startedAt) / half);
  let length = s.level / 100;
  if (s.feel === "tease") {
    length *= 0.4;
    if (id % 6 >= 4)
      return { id, position: 0, durationMs: half };
  } else if (s.feel !== "steady" && s.feel !== "build") {
    length *= envelope(s.feel, "slow", now, s.startedAt);
  }
  return { id, position: id % 2 === 0 ? length : 0, durationMs: half };
}

// src/frontend/engine/engine.ts
var TICK_MS = 100;
var TEST_MS = 2000;
var REACTION_STEP = 15;

class Engine {
  link;
  settings;
  now;
  director;
  governor;
  connection = "disconnected";
  scanning = false;
  paused = false;
  error = null;
  tests = new Map;
  reactions = [];
  listeners = new Set;
  timer = null;
  lastNotify = 0;
  constructor(link, settings, now = () => Date.now()) {
    this.link = link;
    this.settings = settings;
    this.now = now;
    this.director = new Director(settings.zones, settings.limits.holdTimeoutSec * 1000);
    this.governor = new Governor(link, settings.limits, (key) => prefsFor(this.settings, key), (e) => this.fault(e));
  }
  start() {
    this.timer ??= setInterval(() => this.tick(this.now()), TICK_MS);
  }
  async dispose() {
    if (this.timer)
      clearInterval(this.timer);
    this.timer = null;
    await this.stopEverything({ pause: true });
    await this.link.disconnect().catch(() => {});
    this.listeners.clear();
  }
  configure(settings) {
    this.settings = settings;
    this.director.configure(settings.zones, settings.limits.holdTimeoutSec * 1000);
    this.governor.configure(settings.limits, (key) => prefsFor(this.settings, key));
    this.notify(true);
  }
  async connect() {
    this.connection = "connecting";
    this.error = null;
    this.notify(true);
    try {
      await this.link.connect(this.settings.intifaceUrl);
      await this.link.stopAll();
      this.governor.reset();
      this.connection = "connected";
      await this.link.readBatteries();
    } catch (error) {
      this.connection = "disconnected";
      this.error = `Could not connect to ${this.settings.intifaceUrl}: ${String(error).slice(0, 160)}`;
    }
    this.notify(true);
  }
  async disconnect() {
    await this.stopEverything({ pause: false });
    await this.link.disconnect();
    this.connection = "disconnected";
    this.scanning = false;
    this.notify(true);
  }
  handleDisconnected() {
    this.director.stopAll(this.now());
    this.tests.clear();
    if (this.connection === "connected")
      this.error = "Intiface disconnected. All output stopped.";
    this.connection = "disconnected";
    this.scanning = false;
    this.notify(true);
  }
  handleDevicesChanged() {
    const keys = new Set(this.link.list().flatMap((d) => d.outputs.map((o) => o.key)));
    this.governor.retain(keys);
    for (const key of [...this.tests.keys()])
      if (!keys.has(key))
        this.tests.delete(key);
    this.notify(true);
  }
  handleScanningFinished() {
    this.scanning = false;
    this.notify(true);
  }
  async toggleScan() {
    if (this.scanning) {
      await this.link.stopScanning();
      this.scanning = false;
    } else {
      this.scanning = true;
      this.notify(true);
      try {
        await this.link.startScanning();
      } catch (error) {
        this.scanning = false;
        this.error = `Scan failed: ${String(error).slice(0, 160)}`;
      }
    }
    this.notify(true);
  }
  apply(intent, source) {
    if (this.paused && intent.kind !== "stop")
      return;
    this.director.apply(intent, this.now(), source);
    this.notify(true);
  }
  schedule(groupId, cues) {
    if (this.paused)
      return;
    this.director.schedule(groupId, cues);
    this.notify(true);
  }
  cancel(groupId) {
    this.director.cancel(groupId);
    this.notify(true);
  }
  setLocked(zone, locked) {
    this.director.setLocked(zone, locked);
    this.notify(true);
  }
  isLocked(zone) {
    return this.director.isLocked(zone);
  }
  test(key, level) {
    if (this.paused)
      return;
    this.tests.set(key, { level, until: this.now() + TEST_MS });
  }
  react(reaction) {
    this.reactions.push(reaction);
    if (reaction === "stop")
      this.apply({ kind: "stop", zone: ALL_ZONES }, "manual");
    else
      this.apply({ kind: "scene", zone: ALL_ZONES, delta: reaction === "more" ? REACTION_STEP : reaction === "less" ? -REACTION_STEP : 0 }, "manual");
  }
  ease() {
    this.reactions.push("ease");
    const now = this.now();
    for (const v of this.director.views())
      if (v.target > 0)
        this.director.apply({ kind: "scene", zone: v.zone, level: Math.floor(v.target / 2) }, now, "manual");
    this.notify(true);
  }
  peekReactions() {
    return this.reactions;
  }
  takeReactions() {
    const r = this.reactions;
    this.reactions = [];
    return r;
  }
  async stopEverything({ pause }) {
    if (pause)
      this.paused = true;
    this.director.stopAll(this.now());
    this.tests.clear();
    try {
      await this.governor.stopAll();
    } catch (error) {
      this.error = `Stop command failed: ${String(error).slice(0, 160)}`;
    }
    if (!this.paused)
      this.governor.resume();
    this.notify(true);
  }
  panic() {
    return this.stopEverything({ pause: true });
  }
  resume() {
    this.paused = false;
    this.governor.resume();
    this.notify(true);
  }
  fault(error) {
    this.error = `Device command failed, all output stopped: ${String(error).slice(0, 160)}`;
    this.stopEverything({ pause: false });
  }
  tick(now) {
    try {
      this.director.tick(now);
      if (this.connection !== "connected")
        return;
      const outputs = this.link.list().flatMap((d) => d.outputs);
      const groups = new Map;
      for (const o of outputs) {
        const key = sceneKeyFor(o, this.settings);
        if (key)
          groups.set(key, [...groups.get(key) ?? [], o]);
      }
      for (const [sceneKey, group] of groups) {
        const sample = this.director.sample(sceneKey);
        group.forEach((output, i) => {
          const test = this.tests.get(output.key);
          if (test && now < test.until) {
            const s = { level: test.level, feel: "steady", tempo: "medium", startedAt: now };
            this.governor.apply(output, output.kind === "HwPositionWithDuration" ? { kind: "stroke", stroke: renderStroke({ ...s, startedAt: test.until - TEST_MS }, now) } : { kind: "value", value: test.level / 100 }, now);
            return;
          }
          if (test)
            this.tests.delete(output.key);
          const s = sample ?? { level: 0, feel: "steady", tempo: "medium", startedAt: now };
          if (output.kind === "HwPositionWithDuration")
            this.governor.apply(output, { kind: "stroke", stroke: renderStroke(s, now) }, now);
          else
            this.governor.apply(output, { kind: "value", value: renderContinuous(output.kind, s, now, i / group.length) }, now);
        });
      }
      this.notify(false);
    } catch (error) {
      this.fault(error);
    }
  }
  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
  notify(force) {
    const now = this.now();
    if (!force && now - this.lastNotify < 250)
      return;
    this.lastNotify = now;
    for (const l of this.listeners)
      l();
  }
  view() {
    const devices = this.link.list();
    const values = {};
    for (const d of devices)
      for (const o of d.outputs)
        values[o.key] = this.governor.sentValue(o.key);
    return {
      connection: this.connection,
      scanning: this.scanning,
      paused: this.paused,
      error: this.error,
      devices,
      scenes: this.director.views(),
      values,
      pendingCues: this.director.pending().length,
      active: this.director.isActive() || this.tests.size > 0
    };
  }
  summary() {
    return this.paused ? "stopped by the user (paused)" : this.director.summary();
  }
}

// src/shared/plan.ts
function splitSentences(text) {
  const sentences = [];
  const re = /[^.!?…\n]+(?:[.!?…]+["'”’)\]*_]*|\n+|$)/g;
  for (const m of text.matchAll(re)) {
    const raw = m[0];
    const lead = raw.length - raw.trimStart().length;
    const body = raw.trim();
    if (!/[\p{L}\p{N}]/u.test(body))
      continue;
    sentences.push({ index: sentences.length + 1, start: (m.index ?? 0) + lead, text: body });
  }
  return sentences;
}
function cueOffsetsMs(sentences, cues, readingCps) {
  return cues.map((cue) => {
    const s = sentences[cue.sentence - 1];
    return s ? Math.round(s.start / readingCps * 1000) : 0;
  });
}

// src/shared/rules.ts
var MAX_REGEX_INPUT = 20000;
function compileMatcher(match) {
  const trimmed = match.trim();
  if (!trimmed)
    return () => true;
  const regex = /^\/(.+)\/([gimsuy]*)$/s.exec(trimmed);
  if (regex) {
    try {
      const re = new RegExp(regex[1], regex[2].replace("g", ""));
      return (text) => re.test(text.slice(0, MAX_REGEX_INPUT));
    } catch {
      return () => false;
    }
  }
  const keywords = trimmed.split(",").map((k) => k.trim().toLowerCase()).filter(Boolean);
  return (text) => {
    const lower = text.toLowerCase();
    return keywords.some((k) => new RegExp(`(^|[^\\p{L}\\p{N}])${k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}($|[^\\p{L}\\p{N}])`, "u").test(lower));
  };
}
function matchRules(rules, event) {
  return rules.filter((r) => r.enabled && r.when === event.when && (r.characterId === null || r.characterId === event.characterId)).filter((r) => compileMatcher(r.match)(event.text)).map((r) => r.then);
}

// src/shared/safewords.ts
var escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
function matches(text, word) {
  if (!word)
    return false;
  const w = escape(word);
  const whole = new RegExp(`^[\\s*_~"'(\\[]*${w}[\\s*_~"'.!)\\]]*$`, "i");
  const outOfCharacter = new RegExp(`\\(\\(?\\s*${w}\\s*\\)?\\)|\\[\\s*${w}\\s*\\]|\\booc\\s*[:\\-]\\s*${w}\\b`, "i");
  return whole.test(text.trim()) || outOfCharacter.test(text);
}
function matchSafeword(text, words) {
  if (matches(text, words.stop))
    return "stop";
  if (matches(text, words.ease))
    return "ease";
  return null;
}

// src/frontend/triggers/generations.ts
var CHAT_TURNS = new Set(["normal", "regenerate", "swipe", "continue"]);
var MAX_TEXT = 40000;
var str2 = (v) => typeof v === "string" && v ? v : null;

class GenerationTracker {
  live = new Map;
  started(payload, activeChatId, now) {
    if (!isRecord(payload))
      return null;
    const id = str2(payload.generationId);
    const chatId = str2(payload.chatId);
    if (!id || !chatId || chatId !== activeChatId)
      return null;
    if (payload.extensionId || payload.backgroundSwipe === true)
      return null;
    const type = typeof payload.generationType === "string" ? payload.generationType : "normal";
    if (!CHAT_TURNS.has(type))
      return null;
    const superseded = [...this.live.values()].filter((g) => g.chatId === chatId).map((g) => g.id);
    for (const s of superseded)
      this.live.delete(s);
    const generation = {
      id,
      chatId,
      characterId: str2(payload.characterId),
      startedAt: now,
      firstTokenAt: null,
      text: "",
      tokens: 0
    };
    this.live.set(id, generation);
    return { generation, superseded };
  }
  token(payload, now) {
    if (!isRecord(payload) || payload.type === "reasoning" || typeof payload.token !== "string")
      return null;
    const g = this.live.get(String(payload.generationId));
    if (!g)
      return null;
    g.firstTokenAt ??= now;
    g.tokens++;
    if (g.text.length < MAX_TEXT)
      g.text += payload.token;
    return g;
  }
  ended(payload) {
    if (!isRecord(payload))
      return null;
    const g = this.live.get(String(payload.generationId));
    if (!g)
      return null;
    this.live.delete(g.id);
    if (payload.error)
      return null;
    const content = typeof payload.content === "string" && payload.content ? payload.content : g.text;
    return { generation: g, content };
  }
  stopped(payload) {
    if (!isRecord(payload))
      return null;
    const g = this.live.get(String(payload.generationId));
    if (g)
      this.live.delete(g.id);
    return g ?? null;
  }
  clear() {
    const ids = [...this.live.keys()];
    this.live.clear();
    return ids;
  }
}

// src/frontend/triggers/wiring.ts
var STREAM_PULSE_MS = 500;
var describeReaction = (r) => r === "ease" ? "used the slow-down safeword" : r === "hold" ? "asked to hold" : `asked for ${r === "stop" ? "a stop" : r}`;

class Triggers {
  host;
  engine;
  now;
  tracker = new GenerationTracker;
  plans = new Map;
  firedStreamRules = new Map;
  lastPulse = new Map;
  previousUserMessage = "";
  disposers = [];
  planListeners = new Set;
  plan = { state: "idle", detail: "", cues: [] };
  constructor(host, engine, now = () => Date.now()) {
    this.host = host;
    this.engine = engine;
    this.now = now;
  }
  start() {
    const on = (event, fn) => this.disposers.push(this.host.on(event, fn));
    on("GENERATION_STARTED", (p) => this.onStarted(p));
    on("STREAM_TOKEN_RECEIVED", (p) => this.onToken(p));
    on("GENERATION_ENDED", (p) => this.onEnded(p));
    on("GENERATION_STOPPED", (p) => this.onStopped(p));
    on("MESSAGE_SENT", (p) => this.onMessageSent(p));
    on("CHAT_SWITCHED", () => this.onChatSwitched());
  }
  dispose() {
    for (const d of this.disposers)
      d();
    this.disposers = [];
    for (const id of this.tracker.clear())
      this.dropPlan(id);
  }
  onPlanChange(fn) {
    this.planListeners.add(fn);
    return () => this.planListeners.delete(fn);
  }
  setPlan(plan) {
    this.plan = plan;
    for (const l of this.planListeners)
      l();
  }
  mode(chatId, characterId) {
    return modeFor(this.host.settings(), chatId, characterId);
  }
  dropPlan(id) {
    if (this.plans.delete(id))
      this.host.send({ type: "plan_cancel", requestId: id });
    this.engine.cancel(id);
    this.firedStreamRules.delete(id);
    this.lastPulse.delete(id);
  }
  onStarted(payload) {
    const result = this.tracker.started(payload, this.host.activeChat().chatId, this.now());
    if (!result)
      return;
    for (const id of result.superseded)
      this.dropPlan(id);
    for (const id of [...this.plans.keys()])
      this.dropPlan(id);
  }
  onToken(payload) {
    const now = this.now();
    const g = this.tracker.token(payload, now);
    if (!g || this.mode(g.chatId, g.characterId) !== "reactive")
      return;
    const settings = this.host.settings();
    const fired = this.firedStreamRules.get(g.id) ?? new Set;
    this.firedStreamRules.set(g.id, fired);
    for (const rule of settings.rules) {
      if (fired.has(rule.id))
        continue;
      if (matchRules([rule], { when: "streaming", text: g.text, characterId: g.characterId }).length) {
        fired.add(rule.id);
        this.engine.apply(rule.then, "auto");
      }
    }
    if (settings.streamPulse) {
      const last = this.lastPulse.get(g.id) ?? { at: now, tokens: 0 };
      if (now - last.at >= STREAM_PULSE_MS) {
        const rate = (g.tokens - last.tokens) * 1000 / (now - last.at);
        const level = clampLevel(20 + rate * 1.5, 70);
        this.engine.apply({ kind: "scene", zone: ALL_ZONES, level, feel: "pulse", tempo: rate > 25 ? "fast" : "medium" }, "auto");
        this.lastPulse.set(g.id, { at: now, tokens: g.tokens });
      } else if (!this.lastPulse.has(g.id))
        this.lastPulse.set(g.id, last);
    }
  }
  onEnded(payload) {
    const result = this.tracker.ended(payload);
    if (!result)
      return;
    const { generation: g, content } = result;
    this.firedStreamRules.delete(g.id);
    this.lastPulse.delete(g.id);
    const mode = this.mode(g.chatId, g.characterId);
    if (mode === "reactive") {
      for (const intent of matchRules(this.host.settings().rules, { when: "character_message", text: content, characterId: g.characterId }))
        this.engine.apply(intent, "auto");
    } else if (mode === "story" && content.trim()) {
      this.plans.set(g.id, { generation: g, content });
      this.host.send({
        type: "plan_request",
        requestId: g.id,
        chatId: g.chatId,
        characterId: g.characterId,
        content,
        previousUserMessage: this.previousUserMessage,
        status: this.statusLine(true)
      });
      this.setPlan({ state: "planning", detail: "Planning cues for the latest reply…", cues: [] });
    }
  }
  onStopped(payload) {
    const g = this.tracker.stopped(payload);
    if (!g)
      return;
    this.dropPlan(g.id);
    if (this.host.settings().limits.stopOnGenerationStop)
      this.engine.stopEverything({ pause: false });
  }
  onMessageSent(payload) {
    if (!isRecord(payload) || !isRecord(payload.message) || payload.inserted)
      return;
    const message = payload.message;
    if (message.is_user !== true || typeof message.content !== "string")
      return;
    const chatId = typeof payload.chatId === "string" ? payload.chatId : null;
    const settings = this.host.settings();
    const hit = matchSafeword(message.content, settings.safewords);
    if (hit === "stop") {
      this.engine.stopEverything({ pause: true });
      for (const id of [...this.plans.keys()])
        this.dropPlan(id);
      if (chatId && settings.chatModes[chatId] === "story") {
        const chatModes = { ...settings.chatModes };
        delete chatModes[chatId];
        this.host.saveSettings({ ...settings, chatModes });
      }
      this.setPlan({ state: "idle", detail: "Safeword: everything stopped.", cues: [] });
      return;
    }
    if (hit === "ease") {
      this.engine.ease();
      return;
    }
    this.previousUserMessage = message.content;
    if (chatId !== this.host.activeChat().chatId)
      return;
    if (this.mode(chatId, this.host.activeChat().characterId) === "reactive")
      for (const intent of matchRules(settings.rules, { when: "user_message", text: message.content, characterId: null }))
        this.engine.apply(intent, "auto");
  }
  onChatSwitched() {
    for (const id of this.tracker.clear())
      this.dropPlan(id);
    for (const id of [...this.plans.keys()])
      this.dropPlan(id);
    this.previousUserMessage = "";
    this.setPlan({ state: "idle", detail: "", cues: [] });
    this.engine.stopEverything({ pause: false });
  }
  onPlanResult(requestId, cues) {
    const pending = this.plans.get(requestId);
    if (!pending)
      return;
    this.plans.delete(requestId);
    const now = this.now();
    const settings = this.host.settings();
    const sentences = splitSentences(pending.content);
    const offsets = cueOffsetsMs(sentences, cues, settings.story.readingCps);
    const readingStart = pending.generation.firstTokenAt ?? pending.generation.startedAt;
    const scheduled = cues.map((cue, i) => ({ at: Math.max(now, readingStart + offsets[i]), intent: cue.intent }));
    this.engine.schedule(requestId, scheduled);
    this.setPlan({
      state: "planned",
      detail: cues.length ? `${cues.length} cue${cues.length === 1 ? "" : "s"} for the latest reply.` : "The planner chose no cues for this reply.",
      cues: cues.map((cue, i) => ({
        atMs: scheduled[i].at,
        label: describeIntent(cue.intent),
        sentence: sentences[cue.sentence - 1]?.text.slice(0, 80) ?? ""
      }))
    });
  }
  onPlanError(requestId, error) {
    if (!this.plans.delete(requestId))
      return;
    this.setPlan({ state: "failed", detail: error, cues: [] });
  }
  statusLine(consume) {
    const reactions = consume ? this.engine.takeReactions() : this.engine.peekReactions();
    const feedback = reactions.length ? ` Since the last reply the user ${[...new Set(reactions)].map(describeReaction).join(", ")}.` : "";
    return `Now: ${this.engine.summary()}.${feedback}`;
  }
}

// src/frontend/ui/dom.ts
function h(tag, props = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v === null || v === undefined || v === false)
      continue;
    if (typeof v === "function")
      el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === "value" && "value" in el)
      el.value = String(v);
    else if (k === "checked" && el instanceof HTMLInputElement)
      el.checked = Boolean(v);
    else
      el.setAttribute(k, v === true ? "" : String(v));
  }
  for (const c of children)
    if (c !== null && c !== undefined && c !== false)
      el.append(c);
  return el;
}
function select(value, options, onChange, label) {
  return h("select", { class: "tm-input", "aria-label": label, onchange: (e) => onChange(e.target.value) }, ...options.map((o) => {
    const [v, text] = typeof o === "string" ? [o, o] : o;
    return h("option", { value: v, selected: v === value }, text);
  }));
}
function slider(label, value, min, max, step, onCommit, unit = "") {
  const out = h("span", { class: "tm-dim" }, `${value}${unit}`);
  const input = h("input", {
    type: "range",
    min,
    max,
    step,
    value,
    "aria-label": label,
    oninput: (e) => out.textContent = `${e.target.value}${unit}`,
    onchange: (e) => onCommit(Number(e.target.value))
  });
  return h("label", { class: "tm-field" }, h("span", {}, label), input, out);
}
function numberField(label, value, min, max, onCommit) {
  return h("label", { class: "tm-field" }, h("span", {}, label), h("input", { class: "tm-input tm-num", type: "number", min, max, value, onchange: (e) => onCommit(Number(e.target.value)) }));
}
function toggle(label, checked, onChange) {
  return h("label", { class: "tm-toggle" }, h("input", { type: "checkbox", checked, onchange: (e) => onChange(e.target.checked) }), h("span", {}, label));
}
function textField(label, value, onCommit, placeholder = "") {
  return h("label", { class: "tm-field tm-field-wide" }, h("span", {}, label), h("input", { class: "tm-input", type: "text", value, placeholder, onchange: (e) => onCommit(e.target.value) }));
}
function button(text, onClick, cls = "", title) {
  return h("button", { type: "button", class: `tm-btn ${cls}`, title, onclick: onClick }, text);
}
function section(title, open, onToggle, body) {
  const d = h("details", { class: "tm-section", open }, h("summary", {}, title), body);
  d.addEventListener("toggle", () => onToggle(d.open));
  return d;
}

// src/frontend/ui/panel.ts
var MODE_LABELS = { off: "Off", reactive: "Reactive (rules)", story: "Story (planner)" };
var TRIGGER_LABELS = { character_message: "Character reply finished", user_message: "User message sent", streaming: "While reply streams" };
function mountPanel(root, deps) {
  const { engine, triggers } = deps;
  const open = new Set(["live", "devices"]);
  const sec = (id, title, body) => section(title, open.has(id), (o) => o ? open.add(id) : open.delete(id), body);
  const dot = h("span", { class: "tm-dot" });
  const statusText = h("span", {});
  const connectBtn = button("Connect", () => void (engine.view().connection === "connected" ? engine.disconnect() : engine.connect()), "tm-primary");
  const scanBtn = button("Scan", () => void engine.toggleScan());
  const stopBtn = button("STOP ALL", () => void engine.panic(), "tm-stop", "Stop every device and pause Toymate (Shift+Esc)");
  const resumeBtn = button("Resume Toymate", () => engine.resume(), "tm-primary");
  const errorLine = h("div", { class: "tm-error", hidden: true });
  const modeRow = h("div", { class: "tm-row" });
  const reactions = h("div", { class: "tm-row" }, h("span", { class: "tm-dim" }, "React:"), button("More", () => engine.react("more"), "tm-small"), button("Less", () => engine.react("less"), "tm-small"), button("Hold", () => engine.react("hold"), "tm-small"), button("Stop", () => engine.react("stop"), "tm-small"));
  const head = h("div", { class: "tm-head" }, h("div", { class: "tm-row tm-spread" }, h("span", { class: "tm-status" }, dot, statusText), h("span", { class: "tm-row" }, scanBtn, connectBtn)), stopBtn, resumeBtn, errorLine, modeRow, reactions);
  const liveBody = h("div", {});
  const meters = h("div", { style: "display:flex;flex-direction:column;gap:6px" });
  const manual = h("div", {});
  const planBox = h("div", {});
  liveBody.append(meters, manual, planBox);
  const devicesBody = h("div", {});
  const rulesBody = h("div", {});
  const storyBody = h("div", {});
  const safetyBody = h("div", {});
  const connectionBody = h("div", {});
  root.replaceChildren(h("div", { class: "tm-panel" }, head, sec("live", "Live", liveBody), sec("devices", "Devices & zones", devicesBody), sec("rules", "Reactive rules", rulesBody), sec("story", "Story mode", storyBody), sec("safety", "Safety & limits", safetyBody), sec("connection", "Connection", connectionBody)));
  function renderHeader() {
    const v = engine.view();
    dot.dataset.state = v.connection;
    dot.dataset.active = String(v.active);
    statusText.textContent = v.connection === "connected" ? `${v.devices.length} device${v.devices.length === 1 ? "" : "s"}${v.paused ? " · paused" : v.active ? " · running" : ""}` : v.connection === "connecting" ? "Connecting…" : "Not connected";
    connectBtn.textContent = v.connection === "connected" ? "Disconnect" : "Connect";
    connectBtn.disabled = v.connection === "connecting";
    scanBtn.textContent = v.scanning ? "Stop scan" : "Scan";
    scanBtn.disabled = v.connection !== "connected";
    stopBtn.hidden = v.paused;
    resumeBtn.hidden = !v.paused;
    errorLine.hidden = !v.error;
    errorLine.textContent = v.error ?? "";
  }
  function renderMode() {
    const s = deps.settings();
    const { chatId, characterId } = deps.activeChat();
    const setChat = (mode) => deps.update((x) => {
      const chatModes = { ...x.chatModes };
      if (!chatId)
        return x;
      if (mode === "off")
        delete chatModes[chatId];
      else
        chatModes[chatId] = mode;
      return { ...x, chatModes };
    });
    const setCharacter = (mode) => deps.update((x) => {
      const characterModes = { ...x.characterModes };
      if (!characterId)
        return x;
      if (mode === "off")
        delete characterModes[characterId];
      else
        characterModes[characterId] = mode;
      return { ...x, characterModes };
    });
    const effective = chatId && s.chatModes[chatId] || characterId && s.characterModes[characterId] || "off";
    modeRow.replaceChildren(...chatId ? [
      h("span", { class: "tm-dim" }, "Mode:"),
      h("span", { class: "tm-mode", "data-mode": effective }, MODE_LABELS[effective]),
      select(s.chatModes[chatId] ?? "off", MODES.map((m) => [m, `This chat: ${MODE_LABELS[m]}`]), setChat, "Mode for this chat"),
      ...characterId ? [select(s.characterModes[characterId] ?? "off", MODES.map((m) => [m, `Character default: ${MODE_LABELS[m]}`]), setCharacter, "Default mode for this character")] : []
    ] : [h("span", { class: "tm-hint" }, "Open a chat to choose its mode.")]);
  }
  let meterZones = "";
  const meterRefs = new Map;
  function renderMeters() {
    const views = engine.view().scenes;
    const sig = views.map((v) => v.zone).join("|");
    if (sig !== meterZones) {
      meterZones = sig;
      meterRefs.clear();
      meters.replaceChildren(...views.map((v) => {
        const fill = h("i", {});
        const mark = h("b", {});
        const text = h("span", { class: "tm-dim" });
        const lock = h("input", { type: "checkbox", title: "Lock: ignore rules and planner for this zone", onchange: (e) => engine.setLocked(v.zone, e.target.checked) });
        meterRefs.set(v.zone, { fill, mark, text, lock });
        return h("div", { class: "tm-zone" }, h("span", {}, v.zone), h("div", { class: "tm-meter" }, fill, mark), text, h("label", { class: "tm-toggle", title: "Lock zone" }, lock, h("span", { class: "tm-dim" }, "lock")));
      }));
    }
    for (const v of views) {
      const r = meterRefs.get(v.zone);
      if (!r)
        continue;
      r.fill.style.width = `${v.level}%`;
      r.mark.style.left = `${v.target}%`;
      r.text.textContent = v.target > 0 || v.level > 0 ? `${v.level} · ${v.accent ?? `${v.feel}, ${v.tempo}`}` : "idle";
      r.lock.checked = v.locked;
    }
  }
  const draft = { zone: ALL_ZONES, level: 30, feel: "wave", tempo: "medium" };
  function renderManual() {
    const s = deps.settings();
    if (draft.zone !== ALL_ZONES && !s.zones.includes(draft.zone))
      draft.zone = ALL_ZONES;
    const send = (intent) => engine.apply(intent, "manual");
    manual.replaceChildren(h("div", { class: "tm-card" }, h("div", { class: "tm-row" }, select(draft.zone, [ALL_ZONES, ...s.zones], (z) => draft.zone = z, "Zone"), select(draft.feel, FEELS, (f) => draft.feel = f, "Feel"), select(draft.tempo, TEMPOS, (t) => draft.tempo = t, "Tempo")), slider("Level", draft.level, 0, 100, 1, (v) => draft.level = v), h("div", { class: "tm-row" }, button("Play", () => send({ kind: "scene", zone: draft.zone, level: draft.level, feel: draft.feel, tempo: draft.tempo }), "tm-primary"), ...ACCENTS.map((a) => button(a, () => send({ kind: "accent", zone: draft.zone, accent: a }), "tm-small")), button("Stop zone", () => send({ kind: "stop", zone: draft.zone }), "tm-small")), h("div", { class: "tm-hint" }, `Levels are capped at ${s.limits.maxLevel} and mapped onto each output's calibration. Scenes fade after ${Math.round(s.limits.holdTimeoutSec)} s without activity.`)));
  }
  function renderPlan() {
    const p = triggers.plan;
    if (p.state === "idle" && !p.detail) {
      planBox.replaceChildren();
      return;
    }
    const now = Date.now();
    planBox.replaceChildren(h("div", { class: "tm-card" }, h("div", { class: p.state === "failed" ? "tm-error" : "tm-dim" }, p.detail), p.cues.length ? h("ol", { class: "tm-cues" }, ...p.cues.map((c) => h("li", {}, h("b", {}, c.label), " ", h("span", { class: "tm-dim" }, `${c.atMs > now ? `in ${Math.ceil((c.atMs - now) / 1000)} s` : "played"} · “${c.sentence}”`)))) : null));
  }
  let deviceSig = "";
  const valueRefs = new Map;
  function renderDevices(force = false) {
    const v = engine.view();
    const s = deps.settings();
    const sig = JSON.stringify([v.devices.map((d) => [d.name, d.battery, d.outputs.map((o) => o.key)]), s.zones, s.outputs, v.connection]);
    if (sig === deviceSig && !force) {
      for (const [key, el] of valueRefs)
        el.textContent = `${v.values[key] ?? 0}`;
      return;
    }
    deviceSig = sig;
    valueRefs.clear();
    const setPrefs = (key, patch) => deps.update((x) => ({ ...x, outputs: { ...x.outputs, [key]: { ...prefsFor(x, key), ...patch } } }));
    const deviceCard = (d) => h("div", { class: "tm-card" }, h("div", { class: "tm-row tm-spread" }, h("b", {}, d.name), h("span", { class: "tm-dim" }, d.battery === null ? "" : `battery ${d.battery}%`)), ...d.outputs.map((o) => {
      const p = prefsFor(s, o.key);
      const val = h("span", { class: "tm-dim" }, `${v.values[o.key] ?? 0}`);
      valueRefs.set(o.key, val);
      if (UNDRIVEN.has(o.kind))
        return h("div", { class: "tm-hint" }, `Feature ${o.featureIndex}: ${describeKind(o.kind)} (not driven by Toymate)`);
      return h("div", { class: "tm-rule" }, h("div", { class: "tm-row tm-spread" }, h("span", {}, `Feature ${o.featureIndex} · ${describeKind(o.kind)} `, h("span", { class: "tm-dim" }, "now "), val, h("span", { class: "tm-dim" }, ` / ${o.range[1]}`)), select(p.zone, s.zones, (zone) => setPrefs(o.key, { zone }), "Zone")), slider("Floor (barely felt)", p.floor, 0, 100, 1, (floor) => setPrefs(o.key, { floor, ceiling: Math.max(floor, p.ceiling) }), "%"), slider("Ceiling (strongest)", p.ceiling, 0, 100, 1, (ceiling) => setPrefs(o.key, { ceiling, floor: Math.min(p.floor, ceiling) }), "%"), h("div", { class: "tm-row" }, button("Test floor", () => engine.test(o.key, 1), "tm-small", "Runs for 2 seconds at the floor"), button("Test middle", () => engine.test(o.key, 50), "tm-small"), button("Test ceiling", () => engine.test(o.key, 100), "tm-small", "Runs for 2 seconds at the ceiling (or the max level)")));
    }));
    devicesBody.replaceChildren(v.connection !== "connected" ? h("div", { class: "tm-hint" }, "Connect to Intiface to see devices.") : v.devices.length === 0 ? h("div", { class: "tm-hint" }, "No devices yet. Connect them in Intiface, or press Scan.") : h("div", { style: "display:flex;flex-direction:column;gap:8px" }, ...v.devices.map(deviceCard)), textField("Zones", s.zones.join(", "), (text) => deps.update((x) => ({ ...x, zones: text.split(",") }))), h("div", { class: "tm-hint" }, "Zones group outputs (for example: clit, internal, stroker). Rules and the planner address zones, never device names. Temperature outputs only follow their zone by name, never “all”."));
  }
  function renderRules() {
    const s = deps.settings();
    const setRules = (rules) => deps.update((x) => ({ ...x, rules }));
    const patch = (i, r) => setRules(s.rules.map((x, j) => j === i ? { ...x, ...r } : x));
    const thenEditor = (rule, i) => {
      const t = rule.then;
      const action = t.kind;
      const setThen = (then) => patch(i, { then });
      const zone = select(t.zone, [ALL_ZONES, ...s.zones], (zone) => setThen({ ...t, zone }), "Zone");
      const kindSel = select(action, ["scene", "accent", "stop"], (k) => setThen(k === "scene" ? { kind: "scene", zone: t.zone, level: 40, feel: "wave", tempo: "medium" } : k === "accent" ? { kind: "accent", zone: t.zone, accent: "spike" } : { kind: "stop", zone: t.zone }));
      if (t.kind === "scene")
        return h("div", { class: "tm-row" }, kindSel, zone, h("input", { class: "tm-input tm-num", type: "number", min: -100, max: 100, value: t.level ?? t.delta ?? 0, title: "Level 0-100", onchange: (e) => setThen({ ...t, level: Number(e.target.value) }) }), select(t.feel ?? "steady", FEELS, (feel) => setThen({ ...t, feel }), "Feel"), select(t.tempo ?? "medium", TEMPOS, (tempo) => setThen({ ...t, tempo }), "Tempo"));
      if (t.kind === "accent")
        return h("div", { class: "tm-row" }, kindSel, zone, select(t.accent, ACCENTS, (accent) => setThen({ ...t, accent }), "Accent"));
      return h("div", { class: "tm-row" }, kindSel, zone);
    };
    rulesBody.replaceChildren(h("div", { class: "tm-hint" }, "Rules run in chats set to Reactive. Match: comma-separated keywords, or /regex/i. Empty matches everything."), ...s.rules.map((rule, i) => h("div", { class: "tm-rule" }, h("div", { class: "tm-row tm-spread" }, toggle("Enabled", rule.enabled, (enabled) => patch(i, { enabled })), select(rule.when, RULE_TRIGGERS.map((w) => [w, TRIGGER_LABELS[w]]), (when) => patch(i, { when })), button("Delete", () => setRules(s.rules.filter((_, j) => j !== i)), "tm-small tm-danger-text")), textField("Match", rule.match, (match) => patch(i, { match }), "kiss, touch  or  /moan(s|ed)?/i"), thenEditor(rule, i))), h("div", { class: "tm-row" }, button("Add rule", () => setRules([...s.rules, { id: crypto.randomUUID(), enabled: true, when: "character_message", match: "", characterId: null, then: { kind: "scene", zone: ALL_ZONES, level: 30, feel: "wave", tempo: "medium" } }]))), toggle("Stream pulse: pulse while the reply streams (Reactive chats)", s.streamPulse, (streamPulse) => deps.update((x) => ({ ...x, streamPulse }))));
  }
  function renderStory() {
    const s = deps.settings();
    const conns = deps.connections();
    const options = [["", "Active connection"], ...(conns ?? []).map((c) => [c.id, `${c.name} (${c.model})`])];
    if (s.story.connectionId && !options.some(([id]) => id === s.story.connectionId))
      options.push([s.story.connectionId, "Saved connection (not found)"]);
    storyBody.replaceChildren(h("div", { class: "tm-hint" }, "In Story chats, a separate planner call reads each finished reply and schedules cues as you read. Messages stay clean."), h("label", { class: "tm-field tm-field-wide" }, h("span", {}, "Planner connection"), select(s.story.connectionId ?? "", options, (id) => deps.update((x) => ({ ...x, story: { ...x.story, connectionId: id || null } })), "Planner connection")), ...conns === null ? [button("Load connections", () => deps.requestConnections(), "tm-small")] : [], h("div", { class: "tm-hint" }, "Each reply's text is sent to this connection's provider. Pick the provider you already use for roleplay, or a local model. A small fast model is enough; it must support tool calling or JSON output."), numberField("Reading speed (chars/s)", s.story.readingCps, 3, 100, (readingCps) => deps.update((x) => ({ ...x, story: { ...x.story, readingCps } }))), toggle("Character awareness: tell the roleplay model about the devices", s.story.awareness, (awareness) => deps.update((x) => ({ ...x, story: { ...x.story, awareness } }))));
  }
  function renderSafety() {
    const s = deps.settings();
    const L = s.limits;
    const setL = (patch) => deps.update((x) => ({ ...x, limits: { ...x.limits, ...patch } }));
    safetyBody.replaceChildren(slider("Max level", L.maxLevel, 0, 100, 1, (maxLevel) => setL({ maxLevel })), slider("Ramp (levels/s)", L.rampPerSecond, 5, 200, 5, (rampPerSecond) => setL({ rampPerSecond })), numberField("Fade after idle (s)", L.holdTimeoutSec, 10, 3600, (holdTimeoutSec) => setL({ holdTimeoutSec })), toggle("Stop all when a generation is stopped", L.stopOnGenerationStop, (stopOnGenerationStop) => setL({ stopOnGenerationStop })), h("b", {}, "Strokers"), slider("Max stroke speed", L.strokeMaxSpeed, 0.1, 5, 0.1, (strokeMaxSpeed) => setL({ strokeMaxSpeed }), "/s"), slider("Stroke range min", L.strokeMin, 0, 100, 1, (strokeMin) => setL({ strokeMin, strokeMax: Math.max(strokeMin, L.strokeMax) }), "%"), slider("Stroke range max", L.strokeMax, 0, 100, 1, (strokeMax) => setL({ strokeMax, strokeMin: Math.min(L.strokeMin, strokeMax) }), "%"), h("b", {}, "Other devices"), numberField("Air pump max hold (s)", L.constrictMaxHoldSec, 2, 600, (constrictMaxHoldSec) => setL({ constrictMaxHoldSec })), slider("Temperature cap", L.temperatureMax, 0, 100, 1, (temperatureMax) => setL({ temperatureMax }), "%"), numberField("Rotation swap min (ms)", L.rotateSwapMinMs, 200, 60000, (rotateSwapMinMs) => setL({ rotateSwapMinMs })), h("b", {}, "Safewords"), textField("Stop everything", s.safewords.stop, (stop) => deps.update((x) => ({ ...x, safewords: { ...x.safewords, stop } }))), textField("Slow down", s.safewords.ease, (ease) => deps.update((x) => ({ ...x, safewords: { ...x.safewords, ease } }))), h("div", { class: "tm-hint" }, `Send a safeword as the whole message or out of character, e.g. “(${s.safewords.stop})” or “OOC: ${s.safewords.stop}”. Stop pauses Toymate and leaves Story mode. Shift+Esc stops everything from anywhere.`));
  }
  function renderConnection() {
    const s = deps.settings();
    connectionBody.replaceChildren(textField("Intiface URL", s.intifaceUrl, (intifaceUrl) => deps.update((x) => ({ ...x, intifaceUrl: intifaceUrl.trim() })), "ws://127.0.0.1:12345"), toggle("Connect automatically when Lumiverse opens", s.autoConnect, (autoConnect) => deps.update((x) => ({ ...x, autoConnect }))), h("div", { class: "tm-hint" }, "Toymate connects from this browser to Intiface Central on this device. Start the server in Intiface first."));
  }
  const renderSettings = () => {
    renderMode();
    renderManual();
    renderDevices(true);
    renderRules();
    renderStory();
    renderSafety();
    renderConnection();
  };
  renderHeader();
  renderMeters();
  renderPlan();
  renderSettings();
  const unsubEngine = engine.subscribe(() => {
    renderHeader();
    renderMeters();
    renderDevices();
  });
  const unsubPlan = triggers.onPlanChange(renderPlan);
  const planTimer = setInterval(() => triggers.plan.cues.length && renderPlan(), 1000);
  return {
    settingsChanged: renderSettings,
    chatChanged: renderMode,
    dispose() {
      unsubEngine();
      unsubPlan();
      clearInterval(planTimer);
      root.replaceChildren();
    }
  };
}

// src/frontend/ui/styles.ts
var PANEL_CSS = `
.tm-panel { display: flex; flex-direction: column; gap: 10px; padding: 10px; color: var(--lumiverse-text); font-size: calc(13px * var(--lumiverse-font-scale, 1)); }
.tm-panel * { box-sizing: border-box; }
.tm-head { display: flex; flex-direction: column; gap: 8px; padding: 10px; border: 1px solid var(--lumiverse-border); border-radius: var(--lumiverse-radius, 8px); background: var(--lumiverse-bg-elevated, var(--lumiverse-fill-subtle)); }
.tm-row { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; }
.tm-row.tm-spread { justify-content: space-between; }
.tm-status { display: inline-flex; align-items: center; gap: 6px; font-weight: 600; }
.tm-dot { width: 9px; height: 9px; border-radius: 50%; background: var(--lumiverse-text-muted); }
.tm-dot[data-state="connected"] { background: var(--lumiverse-success, #3fb950); }
.tm-dot[data-state="connecting"] { background: var(--lumiverse-warning); }
.tm-dot[data-active="true"] { box-shadow: 0 0 0 3px var(--lumiverse-primary-020); background: var(--lumiverse-primary); }
.tm-btn { padding: 5px 10px; border-radius: var(--lumiverse-radius, 6px); border: 1px solid var(--lumiverse-border); background: var(--lumiverse-fill); color: var(--lumiverse-text); cursor: pointer; font: inherit; }
.tm-btn:hover:not(:disabled) { background: var(--lumiverse-fill-hover); border-color: var(--lumiverse-border-hover); }
.tm-btn:disabled { opacity: .5; cursor: default; }
.tm-btn.tm-primary { background: var(--lumiverse-primary); color: var(--lumiverse-primary-contrast, #fff); border-color: transparent; }
.tm-btn.tm-stop { width: 100%; padding: 10px; font-size: 1.1em; font-weight: 700; letter-spacing: .04em; background: var(--lumiverse-danger); color: #fff; border-color: transparent; }
.tm-btn.tm-small { padding: 2px 8px; font-size: .9em; }
.tm-btn.tm-danger-text { color: var(--lumiverse-danger); }
.tm-error { color: var(--lumiverse-danger); font-size: .92em; }
.tm-dim { color: var(--lumiverse-text-dim); font-size: .92em; }
.tm-hint { color: var(--lumiverse-text-muted); font-size: .88em; line-height: 1.35; }
.tm-mode[data-mode="story"], .tm-mode[data-mode="reactive"] { color: var(--lumiverse-primary-text, var(--lumiverse-primary)); font-weight: 600; }
.tm-section { border: 1px solid var(--lumiverse-border); border-radius: var(--lumiverse-radius, 8px); background: var(--lumiverse-fill-subtle); }
.tm-section > summary { cursor: pointer; padding: 8px 10px; font-weight: 600; }
.tm-section > div { display: flex; flex-direction: column; gap: 8px; padding: 0 10px 10px; }
.tm-field { display: grid; grid-template-columns: 9em 1fr auto; align-items: center; gap: 6px; }
.tm-field-wide { grid-template-columns: 9em 1fr; }
.tm-field input[type="range"] { width: 100%; accent-color: var(--lumiverse-primary); }
.tm-toggle { display: inline-flex; align-items: center; gap: 6px; cursor: pointer; }
.tm-toggle input { accent-color: var(--lumiverse-primary); }
.tm-input { padding: 4px 6px; border-radius: 6px; border: 1px solid var(--lumiverse-border); background: var(--lumiverse-bg); color: var(--lumiverse-text); font: inherit; min-width: 0; }
.tm-num { width: 5.5em; }
.tm-card { display: flex; flex-direction: column; gap: 6px; padding: 8px; border: 1px solid var(--lumiverse-border-light, var(--lumiverse-border)); border-radius: 6px; background: var(--lumiverse-bg); }
.tm-meter { position: relative; height: 8px; border-radius: 4px; background: var(--lumiverse-fill); overflow: hidden; flex: 1; min-width: 60px; }
.tm-meter > i { position: absolute; inset: 0 auto 0 0; background: var(--lumiverse-primary); }
.tm-meter > b { position: absolute; top: 0; bottom: 0; width: 2px; background: var(--lumiverse-text-dim); }
.tm-zone { display: grid; grid-template-columns: 6em 1fr auto auto; align-items: center; gap: 8px; }
.tm-cues { margin: 0; padding-left: 1.2em; display: flex; flex-direction: column; gap: 3px; }
.tm-rule { display: flex; flex-direction: column; gap: 6px; padding: 8px; border-radius: 6px; border: 1px solid var(--lumiverse-border-light, var(--lumiverse-border)); }
`;

// src/frontend.ts
var ICON = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12h3l2-5 3 10 3-8 2 3h7"/></svg>';
var STOP_ICON = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>';
var STATUS_INTERVAL_MS = 2000;
function setup(ctx) {
  let settings = DEFAULT_SETTINGS;
  let settingsLoaded = false;
  let connections = null;
  const send = (m) => ctx.sendToBackend(m);
  const adapter = new ButtplugAdapter({
    onDevicesChanged: () => engine.handleDevicesChanged(),
    onDisconnected: () => engine.handleDisconnected(),
    onScanningFinished: () => engine.handleScanningFinished()
  });
  const engine = new Engine(adapter, settings);
  const update = (mutate) => {
    settings = parseSettings(mutate(settings));
    engine.configure(settings);
    panel.settingsChanged();
    send({ type: "save_settings", settings });
  };
  const triggers = new Triggers({
    on: (event, handler) => ctx.events.on(event, handler),
    activeChat: () => ctx.getActiveChat(),
    send,
    settings: () => settings,
    saveSettings: (s) => update(() => s)
  }, engine);
  ctx.dom.addStyle(PANEL_CSS);
  const tab = ctx.ui.registerDrawerTab({
    id: "toymate",
    title: "Toymate",
    shortName: "Toymate",
    headerTitle: "Toymate",
    description: "Control Buttplug.io / Intiface devices from your chats",
    keywords: ["intiface", "buttplug", "toy", "haptics", "device"],
    iconSvg: ICON
  });
  const panel = mountPanel(tab.root, {
    engine,
    triggers,
    settings: () => settings,
    update,
    activeChat: () => ctx.getActiveChat(),
    connections: () => connections,
    requestConnections: () => send({ type: "list_connections" })
  });
  const stopAction = ctx.ui.registerInputBarAction({ id: "toymate-stop", label: "Toymate: stop all devices", iconSvg: STOP_ICON });
  const offStop = stopAction.onClick(() => void engine.panic());
  let badge = null;
  const offBadge = engine.subscribe(() => {
    const v = engine.view();
    const next = v.error && v.connection !== "connected" ? "!" : v.paused ? "II" : v.active ? "●" : null;
    if (next !== badge)
      tab.setBadge(badge = next);
  });
  const offChat = ctx.events.on("CHAT_SWITCHED", () => panel.chatChanged());
  const offBackend = ctx.onBackendMessage((raw) => {
    const m = asBackendMessage(raw);
    if (!m)
      return;
    switch (m.type) {
      case "settings": {
        const first = !settingsLoaded;
        settingsLoaded = true;
        settings = parseSettings(m.settings);
        engine.configure(settings);
        panel.settingsChanged();
        if (first && settings.autoConnect)
          engine.connect();
        break;
      }
      case "plan_result":
        triggers.onPlanResult(m.requestId, m.cues);
        break;
      case "plan_error":
        triggers.onPlanError(m.requestId, m.error);
        break;
      case "connections":
        connections = m.connections;
        panel.settingsChanged();
        break;
    }
  });
  let lastStatus = "";
  const statusTimer = setInterval(() => {
    const chatId = ctx.getActiveChat().chatId;
    const status = triggers.statusLine(false);
    if (`${chatId}|${status}` === lastStatus)
      return;
    lastStatus = `${chatId}|${status}`;
    send({ type: "status", chatId, status });
  }, STATUS_INTERVAL_MS);
  const onKey = (e) => {
    if (e.key === "Escape" && e.shiftKey)
      engine.panic();
  };
  const onHide = () => void engine.panic();
  window.addEventListener("keydown", onKey, true);
  window.addEventListener("pagehide", onHide);
  engine.start();
  triggers.start();
  ctx.ready();
  send({ type: "hello" });
  send({ type: "list_connections" });
  return async () => {
    window.removeEventListener("keydown", onKey, true);
    window.removeEventListener("pagehide", onHide);
    clearInterval(statusTimer);
    offBackend();
    offChat();
    offBadge();
    offStop();
    triggers.dispose();
    await engine.dispose();
    panel.dispose();
    stopAction.destroy();
    tab.destroy();
  };
}
export {
  setup
};
