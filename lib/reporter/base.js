var tty = require('tty'),
    util = require('util'),
    events = require('events'),
    isatty = tty.isatty(1) && tty.isatty(2);

function Base() {
    var stats = this.stats = {
            suites: 0,
            tests: 0,
            passes: 0,
            pending: 0,
            failures: 0,
            runner: {}
        },
        failures = this.failures = [];

    events.EventEmitter.call(this);

    this.on('start', function() {
        stats.start = new Date();
    });

    this.on('runner:start', function(runner) {
        stats.runner[runner.pid] = {
            start: new Date(),
            capabilities: runner.capabilities,
            tests: []
        };
    });

    this.on('suite:start', function(suite) {
        suite.root || stats.suites++;
    });

    this.on('test:end', function() {
        stats.tests++;
    });

    this.on('test:pass', function(test) {
        stats.runner[test.pid].tests.push(true);
        stats.passes++;
    });

    this.on('test:fail', function(test) {
        stats.failures++;
        stats.runner[test.pid].tests.push(false);
        failures.push(test);
    });

    this.on('test:pending', function() {
        stats.pending++;
    });

    this.on('runner:end', function(runner) {
        stats.runner[runner.pid].end = new Date();
    });

    this.on('end', function() {
        stats.end = new Date();
        stats.duration = new Date() - stats.start;
        this.epilogue();
    });
}

/**
 * Inherit from EventEmitter
 */
util.inherits(Base, events.EventEmitter);

/**
 * Expose some basic cursor interactions
 * that are common among reporters.
 */
Base.prototype.cursor = {
    hide: function() {
        isatty && process.stdout.write('\u001b[?25l');
    },

    show: function() {
        isatty && process.stdout.write('\u001b[?25h');
    },

    deleteLine: function() {
        isatty && process.stdout.write('\u001b[2K');
    },

    beginningOfLine: function() {
        isatty && process.stdout.write('\u001b[0G');
    },

    CR: function() {
        if (isatty) {
            exports.cursor.deleteLine();
            exports.cursor.beginningOfLine();
        } else {
            process.stdout.write('\r');
        }
    }
};

/**
 * Default color map.
 */
Base.prototype.colors = {
    'pass': 90,
    'fail': 31,
    'bright pass': 92,
    'bright fail': 91,
    'bright yellow': 93,
    'pending': 36,
    'suite': 0,
    'error title': 0,
    'error message': 31,
    'error stack': 90,
    'checkmark': 32,
    'fast': 90,
    'medium': 33,
    'slow': 31,
    'green': 32,
    'light': 90,
    'diff gutter': 90,
    'diff added': 32,
    'diff removed': 31
};

/**
 * Default symbol map.
 */
Base.prototype.symbols = {
    ok: '✓',
    err: '✖',
    dot: '․'
};

/**
 * With node.js on Windows: use symbols available in terminal default fonts
 */
if ('win32' == process.platform) {
    Base.prototype.symbols.ok = '\u221A';
    Base.prototype.symbols.err = '\u00D7';
    Base.prototype.symbols.dot = '.';
}

/**
 * Color `str` with the given `type`,
 * allowing colors to be disabled,
 * as well as user-defined color
 * schemes.
 *
 * @param {String} type
 * @param {String} str
 * @return {String}
 * @api private
 */
Base.prototype.color = function(type, str) {
    // if (!exports.useColors) return String(str);
    return '\u001b[' + this.colors[type] + 'm' + str + '\u001b[0m';
};

/**
 * Output common epilogue used by many of
 * the bundled reporters.
 *
 * @api public
 */
Base.prototype.epilogue = function() {
    var stats = this.stats,
        fmt;

    console.log('\n');

    // passes
    fmt = this.color('green', '%d passing') + this.color('light', ' (%s)');
    console.log(fmt, stats.passes || 0, stats.duration);

    // pending
    if (stats.pending) {
        fmt = this.color('pending', ' %d pending');
        console.log(fmt, stats.pending);
    }

    // failures
    if (stats.failures) {
        fmt = this.color('fail', '%d failing');
        console.log(fmt, stats.failures);
        this.listFailures();
    }

    console.log();
};

/**
 * Outut the given failures as a list
 */
Base.prototype.listFailures = function() {
    var self = this;

    console.log();

    this.failures.forEach(function(test, i) {
        // format
        var fmt = self.color('error title', '%s) %s:\n') +
                  self.color('error message', '%s') +
                  self.color('error stack', '\n%s\n');

        console.log(fmt, (i + 1), test.title, test.err.message, test.err.stack);
    });
};

/**
 * Expose `Base`.
 */
exports = module.exports = Base;