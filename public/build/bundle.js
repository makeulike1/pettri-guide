
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
var app = (function () {
    'use strict';

    function noop() { }
    function assign(tar, src) {
        // @ts-ignore
        for (const k in src)
            tar[k] = src[k];
        return tar;
    }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function validate_store(store, name) {
        if (store != null && typeof store.subscribe !== 'function') {
            throw new Error(`'${name}' is not a store with a 'subscribe' method`);
        }
    }
    function subscribe(store, ...callbacks) {
        if (store == null) {
            return noop;
        }
        const unsub = store.subscribe(...callbacks);
        return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
    }
    function get_store_value(store) {
        let value;
        subscribe(store, _ => value = _)();
        return value;
    }
    function component_subscribe(component, store, callback) {
        component.$$.on_destroy.push(subscribe(store, callback));
    }
    function create_slot(definition, ctx, $$scope, fn) {
        if (definition) {
            const slot_ctx = get_slot_context(definition, ctx, $$scope, fn);
            return definition[0](slot_ctx);
        }
    }
    function get_slot_context(definition, ctx, $$scope, fn) {
        return definition[1] && fn
            ? assign($$scope.ctx.slice(), definition[1](fn(ctx)))
            : $$scope.ctx;
    }
    function get_slot_changes(definition, $$scope, dirty, fn) {
        if (definition[2] && fn) {
            const lets = definition[2](fn(dirty));
            if ($$scope.dirty === undefined) {
                return lets;
            }
            if (typeof lets === 'object') {
                const merged = [];
                const len = Math.max($$scope.dirty.length, lets.length);
                for (let i = 0; i < len; i += 1) {
                    merged[i] = $$scope.dirty[i] | lets[i];
                }
                return merged;
            }
            return $$scope.dirty | lets;
        }
        return $$scope.dirty;
    }
    function update_slot_base(slot, slot_definition, ctx, $$scope, slot_changes, get_slot_context_fn) {
        if (slot_changes) {
            const slot_context = get_slot_context(slot_definition, ctx, $$scope, get_slot_context_fn);
            slot.p(slot_context, slot_changes);
        }
    }
    function get_all_dirty_from_scope($$scope) {
        if ($$scope.ctx.length > 32) {
            const dirty = [];
            const length = $$scope.ctx.length / 32;
            for (let i = 0; i < length; i++) {
                dirty[i] = -1;
            }
            return dirty;
        }
        return -1;
    }
    function exclude_internal_props(props) {
        const result = {};
        for (const k in props)
            if (k[0] !== '$')
                result[k] = props[k];
        return result;
    }
    function compute_rest_props(props, keys) {
        const rest = {};
        keys = new Set(keys);
        for (const k in props)
            if (!keys.has(k) && k[0] !== '$')
                rest[k] = props[k];
        return rest;
    }
    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_style(node, key, value, important) {
        if (value === null) {
            node.style.removeProperty(key);
        }
        else {
            node.style.setProperty(key, value, important ? 'important' : '');
        }
    }
    function custom_event(type, detail, { bubbles = false, cancelable = false } = {}) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, cancelable, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error('Function called outside component initialization');
        return current_component;
    }
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }
    function onDestroy(fn) {
        get_current_component().$$.on_destroy.push(fn);
    }
    function setContext(key, context) {
        get_current_component().$$.context.set(key, context);
        return context;
    }
    function getContext(key) {
        return get_current_component().$$.context.get(key);
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function tick() {
        schedule_update();
        return resolved_promise;
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    // flush() calls callbacks in this order:
    // 1. All beforeUpdate callbacks, in order: parents before children
    // 2. All bind:this callbacks, in reverse order: children before parents.
    // 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
    //    for afterUpdates called during the initial onMount, which are called in
    //    reverse order: children before parents.
    // Since callbacks might update component values, which could trigger another
    // call to flush(), the following steps guard against this:
    // 1. During beforeUpdate, any updated components will be added to the
    //    dirty_components array and will cause a reentrant call to flush(). Because
    //    the flush index is kept outside the function, the reentrant call will pick
    //    up where the earlier call left off and go through all dirty components. The
    //    current_component value is saved and restored so that the reentrant call will
    //    not interfere with the "parent" flush() call.
    // 2. bind:this callbacks cannot trigger new flush() calls.
    // 3. During afterUpdate, any updated components will NOT have their afterUpdate
    //    callback called a second time; the seen_callbacks set, outside the flush()
    //    function, guarantees this behavior.
    const seen_callbacks = new Set();
    let flushidx = 0; // Do *not* move this inside the flush() function
    function flush() {
        const saved_component = current_component;
        do {
            // first, call beforeUpdate functions
            // and update components
            while (flushidx < dirty_components.length) {
                const component = dirty_components[flushidx];
                flushidx++;
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            flushidx = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        seen_callbacks.clear();
        set_current_component(saved_component);
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
        else if (callback) {
            callback();
        }
    }

    function get_spread_update(levels, updates) {
        const update = {};
        const to_null_out = {};
        const accounted_for = { $$scope: 1 };
        let i = levels.length;
        while (i--) {
            const o = levels[i];
            const n = updates[i];
            if (n) {
                for (const key in o) {
                    if (!(key in n))
                        to_null_out[key] = 1;
                }
                for (const key in n) {
                    if (!accounted_for[key]) {
                        update[key] = n[key];
                        accounted_for[key] = 1;
                    }
                }
                levels[i] = n;
            }
            else {
                for (const key in o) {
                    accounted_for[key] = 1;
                }
            }
        }
        for (const key in to_null_out) {
            if (!(key in update))
                update[key] = undefined;
        }
        return update;
    }
    function get_spread_object(spread_props) {
        return typeof spread_props === 'object' && spread_props !== null ? spread_props : {};
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = on_mount.map(run).filter(is_function);
                if (on_destroy) {
                    on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.50.0' }, detail), { bubbles: true }));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    /*
     * Adapted from https://github.com/reach/router/blob/b60e6dd781d5d3a4bdaaf4de665649c0f6a7e78d/src/lib/utils.js
     *
     * https://github.com/reach/router/blob/master/LICENSE
     */

    const isUndefined = value => typeof value === "undefined";

    const isFunction = value => typeof value === "function";

    const isNumber = value => typeof value === "number";

    function createCounter() {
    	let i = 0;
    	/**
    	 * Returns an id and increments the internal state
    	 * @returns {number}
    	 */
    	return () => i++;
    }

    /**
     * Create a globally unique id
     *
     * @returns {string} An id
     */
    function createGlobalId() {
    	return Math.random().toString(36).substring(2);
    }

    const isSSR = typeof window === "undefined";

    function addListener(target, type, handler) {
    	target.addEventListener(type, handler);
    	return () => target.removeEventListener(type, handler);
    }

    const subscriber_queue = [];
    /**
     * Creates a `Readable` store that allows reading by subscription.
     * @param value initial value
     * @param {StartStopNotifier}start start and stop notifications for subscriptions
     */
    function readable(value, start) {
        return {
            subscribe: writable(value, start).subscribe
        };
    }
    /**
     * Create a `Writable` store that allows both updating and reading by subscription.
     * @param {*=}value initial value
     * @param {StartStopNotifier=}start start and stop notifications for subscriptions
     */
    function writable(value, start = noop) {
        let stop;
        const subscribers = new Set();
        function set(new_value) {
            if (safe_not_equal(value, new_value)) {
                value = new_value;
                if (stop) { // store is ready
                    const run_queue = !subscriber_queue.length;
                    for (const subscriber of subscribers) {
                        subscriber[1]();
                        subscriber_queue.push(subscriber, value);
                    }
                    if (run_queue) {
                        for (let i = 0; i < subscriber_queue.length; i += 2) {
                            subscriber_queue[i][0](subscriber_queue[i + 1]);
                        }
                        subscriber_queue.length = 0;
                    }
                }
            }
        }
        function update(fn) {
            set(fn(value));
        }
        function subscribe(run, invalidate = noop) {
            const subscriber = [run, invalidate];
            subscribers.add(subscriber);
            if (subscribers.size === 1) {
                stop = start(set) || noop;
            }
            run(value);
            return () => {
                subscribers.delete(subscriber);
                if (subscribers.size === 0) {
                    stop();
                    stop = null;
                }
            };
        }
        return { set, update, subscribe };
    }
    function derived(stores, fn, initial_value) {
        const single = !Array.isArray(stores);
        const stores_array = single
            ? [stores]
            : stores;
        const auto = fn.length < 2;
        return readable(initial_value, (set) => {
            let inited = false;
            const values = [];
            let pending = 0;
            let cleanup = noop;
            const sync = () => {
                if (pending) {
                    return;
                }
                cleanup();
                const result = fn(single ? values[0] : values, set);
                if (auto) {
                    set(result);
                }
                else {
                    cleanup = is_function(result) ? result : noop;
                }
            };
            const unsubscribers = stores_array.map((store, i) => subscribe(store, (value) => {
                values[i] = value;
                pending &= ~(1 << i);
                if (inited) {
                    sync();
                }
            }, () => {
                pending |= (1 << i);
            }));
            inited = true;
            sync();
            return function stop() {
                run_all(unsubscribers);
                cleanup();
            };
        });
    }

    /*
     * Adapted from https://github.com/EmilTholin/svelte-routing
     *
     * https://github.com/EmilTholin/svelte-routing/blob/master/LICENSE
     */

    const createKey = ctxName => `@@svnav-ctx__${ctxName}`;

    // Use strings instead of objects, so different versions of
    // svelte-navigator can potentially still work together
    const LOCATION = createKey("LOCATION");
    const ROUTER = createKey("ROUTER");
    const ROUTE = createKey("ROUTE");
    const ROUTE_PARAMS = createKey("ROUTE_PARAMS");
    const FOCUS_ELEM = createKey("FOCUS_ELEM");

    const paramRegex = /^:(.+)/;

    /**
     * Check if `string` starts with `search`
     * @param {string} string
     * @param {string} search
     * @return {boolean}
     */
    const startsWith = (string, search) =>
    	string.substr(0, search.length) === search;

    /**
     * Check if `segment` is a root segment
     * @param {string} segment
     * @return {boolean}
     */
    const isRootSegment = segment => segment === "";

    /**
     * Check if `segment` is a dynamic segment
     * @param {string} segment
     * @return {boolean}
     */
    const isDynamic = segment => paramRegex.test(segment);

    /**
     * Check if `segment` is a splat
     * @param {string} segment
     * @return {boolean}
     */
    const isSplat = segment => segment[0] === "*";

    /**
     * Strip potention splat and splatname of the end of a path
     * @param {string} str
     * @return {string}
     */
    const stripSplat = str => str.replace(/\*.*$/, "");

    /**
     * Strip `str` of potential start and end `/`
     * @param {string} str
     * @return {string}
     */
    const stripSlashes = str => str.replace(/(^\/+|\/+$)/g, "");

    /**
     * Split up the URI into segments delimited by `/`
     * @param {string} uri
     * @return {string[]}
     */
    function segmentize(uri, filterFalsy = false) {
    	const segments = stripSlashes(uri).split("/");
    	return filterFalsy ? segments.filter(Boolean) : segments;
    }

    /**
     * Add the query to the pathname if a query is given
     * @param {string} pathname
     * @param {string} [query]
     * @return {string}
     */
    const addQuery = (pathname, query) =>
    	pathname + (query ? `?${query}` : "");

    /**
     * Normalizes a basepath
     *
     * @param {string} path
     * @returns {string}
     *
     * @example
     * normalizePath("base/path/") // -> "/base/path"
     */
    const normalizePath = path => `/${stripSlashes(path)}`;

    /**
     * Joins and normalizes multiple path fragments
     *
     * @param {...string} pathFragments
     * @returns {string}
     */
    function join(...pathFragments) {
    	const joinFragment = fragment => segmentize(fragment, true).join("/");
    	const joinedSegments = pathFragments.map(joinFragment).join("/");
    	return normalizePath(joinedSegments);
    }

    // We start from 1 here, so we can check if an origin id has been passed
    // by using `originId || <fallback>`
    const LINK_ID = 1;
    const ROUTE_ID = 2;
    const ROUTER_ID = 3;
    const USE_FOCUS_ID = 4;
    const USE_LOCATION_ID = 5;
    const USE_MATCH_ID = 6;
    const USE_NAVIGATE_ID = 7;
    const USE_PARAMS_ID = 8;
    const USE_RESOLVABLE_ID = 9;
    const USE_RESOLVE_ID = 10;
    const NAVIGATE_ID = 11;

    const labels = {
    	[LINK_ID]: "Link",
    	[ROUTE_ID]: "Route",
    	[ROUTER_ID]: "Router",
    	[USE_FOCUS_ID]: "useFocus",
    	[USE_LOCATION_ID]: "useLocation",
    	[USE_MATCH_ID]: "useMatch",
    	[USE_NAVIGATE_ID]: "useNavigate",
    	[USE_PARAMS_ID]: "useParams",
    	[USE_RESOLVABLE_ID]: "useResolvable",
    	[USE_RESOLVE_ID]: "useResolve",
    	[NAVIGATE_ID]: "navigate",
    };

    const createLabel = labelId => labels[labelId];

    function createIdentifier(labelId, props) {
    	let attr;
    	if (labelId === ROUTE_ID) {
    		attr = props.path ? `path="${props.path}"` : "default";
    	} else if (labelId === LINK_ID) {
    		attr = `to="${props.to}"`;
    	} else if (labelId === ROUTER_ID) {
    		attr = `basepath="${props.basepath || ""}"`;
    	}
    	return `<${createLabel(labelId)} ${attr || ""} />`;
    }

    function createMessage(labelId, message, props, originId) {
    	const origin = props && createIdentifier(originId || labelId, props);
    	const originMsg = origin ? `\n\nOccurred in: ${origin}` : "";
    	const label = createLabel(labelId);
    	const msg = isFunction(message) ? message(label) : message;
    	return `<${label}> ${msg}${originMsg}`;
    }

    const createMessageHandler = handler => (...args) =>
    	handler(createMessage(...args));

    const fail = createMessageHandler(message => {
    	throw new Error(message);
    });

    // eslint-disable-next-line no-console
    const warn = createMessageHandler(console.warn);

    const SEGMENT_POINTS = 4;
    const STATIC_POINTS = 3;
    const DYNAMIC_POINTS = 2;
    const SPLAT_PENALTY = 1;
    const ROOT_POINTS = 1;

    /**
     * Score a route depending on how its individual segments look
     * @param {object} route
     * @param {number} index
     * @return {object}
     */
    function rankRoute(route, index) {
    	const score = route.default
    		? 0
    		: segmentize(route.fullPath).reduce((acc, segment) => {
    				let nextScore = acc;
    				nextScore += SEGMENT_POINTS;

    				if (isRootSegment(segment)) {
    					nextScore += ROOT_POINTS;
    				} else if (isDynamic(segment)) {
    					nextScore += DYNAMIC_POINTS;
    				} else if (isSplat(segment)) {
    					nextScore -= SEGMENT_POINTS + SPLAT_PENALTY;
    				} else {
    					nextScore += STATIC_POINTS;
    				}

    				return nextScore;
    		  }, 0);

    	return { route, score, index };
    }

    /**
     * Give a score to all routes and sort them on that
     * @param {object[]} routes
     * @return {object[]}
     */
    function rankRoutes(routes) {
    	return (
    		routes
    			.map(rankRoute)
    			// If two routes have the exact same score, we go by index instead
    			.sort((a, b) => {
    				if (a.score < b.score) {
    					return 1;
    				}
    				if (a.score > b.score) {
    					return -1;
    				}
    				return a.index - b.index;
    			})
    	);
    }

    /**
     * Ranks and picks the best route to match. Each segment gets the highest
     * amount of points, then the type of segment gets an additional amount of
     * points where
     *
     *  static > dynamic > splat > root
     *
     * This way we don't have to worry about the order of our routes, let the
     * computers do it.
     *
     * A route looks like this
     *
     *  { fullPath, default, value }
     *
     * And a returned match looks like:
     *
     *  { route, params, uri }
     *
     * @param {object[]} routes
     * @param {string} uri
     * @return {?object}
     */
    function pick(routes, uri) {
    	let bestMatch;
    	let defaultMatch;

    	const [uriPathname] = uri.split("?");
    	const uriSegments = segmentize(uriPathname);
    	const isRootUri = uriSegments[0] === "";
    	const ranked = rankRoutes(routes);

    	for (let i = 0, l = ranked.length; i < l; i++) {
    		const { route } = ranked[i];
    		let missed = false;
    		const params = {};

    		// eslint-disable-next-line no-shadow
    		const createMatch = uri => ({ ...route, params, uri });

    		if (route.default) {
    			defaultMatch = createMatch(uri);
    			continue;
    		}

    		const routeSegments = segmentize(route.fullPath);
    		const max = Math.max(uriSegments.length, routeSegments.length);
    		let index = 0;

    		for (; index < max; index++) {
    			const routeSegment = routeSegments[index];
    			const uriSegment = uriSegments[index];

    			if (!isUndefined(routeSegment) && isSplat(routeSegment)) {
    				// Hit a splat, just grab the rest, and return a match
    				// uri:   /files/documents/work
    				// route: /files/* or /files/*splatname
    				const splatName = routeSegment === "*" ? "*" : routeSegment.slice(1);

    				params[splatName] = uriSegments
    					.slice(index)
    					.map(decodeURIComponent)
    					.join("/");
    				break;
    			}

    			if (isUndefined(uriSegment)) {
    				// URI is shorter than the route, no match
    				// uri:   /users
    				// route: /users/:userId
    				missed = true;
    				break;
    			}

    			const dynamicMatch = paramRegex.exec(routeSegment);

    			if (dynamicMatch && !isRootUri) {
    				const value = decodeURIComponent(uriSegment);
    				params[dynamicMatch[1]] = value;
    			} else if (routeSegment !== uriSegment) {
    				// Current segments don't match, not dynamic, not splat, so no match
    				// uri:   /users/123/settings
    				// route: /users/:id/profile
    				missed = true;
    				break;
    			}
    		}

    		if (!missed) {
    			bestMatch = createMatch(join(...uriSegments.slice(0, index)));
    			break;
    		}
    	}

    	return bestMatch || defaultMatch || null;
    }

    /**
     * Check if the `route.fullPath` matches the `uri`.
     * @param {Object} route
     * @param {string} uri
     * @return {?object}
     */
    function match(route, uri) {
    	return pick([route], uri);
    }

    /**
     * Resolve URIs as though every path is a directory, no files. Relative URIs
     * in the browser can feel awkward because not only can you be "in a directory",
     * you can be "at a file", too. For example:
     *
     *  browserSpecResolve('foo', '/bar/') => /bar/foo
     *  browserSpecResolve('foo', '/bar') => /foo
     *
     * But on the command line of a file system, it's not as complicated. You can't
     * `cd` from a file, only directories. This way, links have to know less about
     * their current path. To go deeper you can do this:
     *
     *  <Link to="deeper"/>
     *  // instead of
     *  <Link to=`{${props.uri}/deeper}`/>
     *
     * Just like `cd`, if you want to go deeper from the command line, you do this:
     *
     *  cd deeper
     *  # not
     *  cd $(pwd)/deeper
     *
     * By treating every path as a directory, linking to relative paths should
     * require less contextual information and (fingers crossed) be more intuitive.
     * @param {string} to
     * @param {string} base
     * @return {string}
     */
    function resolve(to, base) {
    	// /foo/bar, /baz/qux => /foo/bar
    	if (startsWith(to, "/")) {
    		return to;
    	}

    	const [toPathname, toQuery] = to.split("?");
    	const [basePathname] = base.split("?");
    	const toSegments = segmentize(toPathname);
    	const baseSegments = segmentize(basePathname);

    	// ?a=b, /users?b=c => /users?a=b
    	if (toSegments[0] === "") {
    		return addQuery(basePathname, toQuery);
    	}

    	// profile, /users/789 => /users/789/profile
    	if (!startsWith(toSegments[0], ".")) {
    		const pathname = baseSegments.concat(toSegments).join("/");
    		return addQuery((basePathname === "/" ? "" : "/") + pathname, toQuery);
    	}

    	// ./       , /users/123 => /users/123
    	// ../      , /users/123 => /users
    	// ../..    , /users/123 => /
    	// ../../one, /a/b/c/d   => /a/b/one
    	// .././one , /a/b/c/d   => /a/b/c/one
    	const allSegments = baseSegments.concat(toSegments);
    	const segments = [];

    	allSegments.forEach(segment => {
    		if (segment === "..") {
    			segments.pop();
    		} else if (segment !== ".") {
    			segments.push(segment);
    		}
    	});

    	return addQuery(`/${segments.join("/")}`, toQuery);
    }

    /**
     * Normalizes a location for consumption by `Route` children and the `Router`.
     * It removes the apps basepath from the pathname
     * and sets default values for `search` and `hash` properties.
     *
     * @param {Object} location The current global location supplied by the history component
     * @param {string} basepath The applications basepath (i.e. when serving from a subdirectory)
     *
     * @returns The normalized location
     */
    function normalizeLocation(location, basepath) {
    	const { pathname, hash = "", search = "", state } = location;
    	const baseSegments = segmentize(basepath, true);
    	const pathSegments = segmentize(pathname, true);
    	while (baseSegments.length) {
    		if (baseSegments[0] !== pathSegments[0]) {
    			fail(
    				ROUTER_ID,
    				`Invalid state: All locations must begin with the basepath "${basepath}", found "${pathname}"`,
    			);
    		}
    		baseSegments.shift();
    		pathSegments.shift();
    	}
    	return {
    		pathname: join(...pathSegments),
    		hash,
    		search,
    		state,
    	};
    }

    const normalizeUrlFragment = frag => (frag.length === 1 ? "" : frag);

    /**
     * Creates a location object from an url.
     * It is used to create a location from the url prop used in SSR
     *
     * @param {string} url The url string (e.g. "/path/to/somewhere")
     *
     * @returns {{ pathname: string; search: string; hash: string }} The location
     */
    function createLocation(url) {
    	const searchIndex = url.indexOf("?");
    	const hashIndex = url.indexOf("#");
    	const hasSearchIndex = searchIndex !== -1;
    	const hasHashIndex = hashIndex !== -1;
    	const hash = hasHashIndex ? normalizeUrlFragment(url.substr(hashIndex)) : "";
    	const pathnameAndSearch = hasHashIndex ? url.substr(0, hashIndex) : url;
    	const search = hasSearchIndex
    		? normalizeUrlFragment(pathnameAndSearch.substr(searchIndex))
    		: "";
    	const pathname = hasSearchIndex
    		? pathnameAndSearch.substr(0, searchIndex)
    		: pathnameAndSearch;
    	return { pathname, search, hash };
    }

    /**
     * Resolves a link relative to the parent Route and the Routers basepath.
     *
     * @param {string} path The given path, that will be resolved
     * @param {string} routeBase The current Routes base path
     * @param {string} appBase The basepath of the app. Used, when serving from a subdirectory
     * @returns {string} The resolved path
     *
     * @example
     * resolveLink("relative", "/routeBase", "/") // -> "/routeBase/relative"
     * resolveLink("/absolute", "/routeBase", "/") // -> "/absolute"
     * resolveLink("relative", "/routeBase", "/base") // -> "/base/routeBase/relative"
     * resolveLink("/absolute", "/routeBase", "/base") // -> "/base/absolute"
     */
    function resolveLink(path, routeBase, appBase) {
    	return join(appBase, resolve(path, routeBase));
    }

    /**
     * Get the uri for a Route, by matching it against the current location.
     *
     * @param {string} routePath The Routes resolved path
     * @param {string} pathname The current locations pathname
     */
    function extractBaseUri(routePath, pathname) {
    	const fullPath = normalizePath(stripSplat(routePath));
    	const baseSegments = segmentize(fullPath, true);
    	const pathSegments = segmentize(pathname, true).slice(0, baseSegments.length);
    	const routeMatch = match({ fullPath }, join(...pathSegments));
    	return routeMatch && routeMatch.uri;
    }

    /*
     * Adapted from https://github.com/reach/router/blob/b60e6dd781d5d3a4bdaaf4de665649c0f6a7e78d/src/lib/history.js
     *
     * https://github.com/reach/router/blob/master/LICENSE
     */

    const POP = "POP";
    const PUSH = "PUSH";
    const REPLACE = "REPLACE";

    function getLocation(source) {
    	return {
    		...source.location,
    		pathname: encodeURI(decodeURI(source.location.pathname)),
    		state: source.history.state,
    		_key: (source.history.state && source.history.state._key) || "initial",
    	};
    }

    function createHistory(source) {
    	let listeners = [];
    	let location = getLocation(source);
    	let action = POP;

    	const notifyListeners = (listenerFns = listeners) =>
    		listenerFns.forEach(listener => listener({ location, action }));

    	return {
    		get location() {
    			return location;
    		},
    		listen(listener) {
    			listeners.push(listener);

    			const popstateListener = () => {
    				location = getLocation(source);
    				action = POP;
    				notifyListeners([listener]);
    			};

    			// Call listener when it is registered
    			notifyListeners([listener]);

    			const unlisten = addListener(source, "popstate", popstateListener);
    			return () => {
    				unlisten();
    				listeners = listeners.filter(fn => fn !== listener);
    			};
    		},
    		/**
    		 * Navigate to a new absolute route.
    		 *
    		 * @param {string|number} to The path to navigate to.
    		 *
    		 * If `to` is a number we will navigate to the stack entry index + `to`
    		 * (-> `navigate(-1)`, is equivalent to hitting the back button of the browser)
    		 * @param {Object} options
    		 * @param {*} [options.state] The state will be accessible through `location.state`
    		 * @param {boolean} [options.replace=false] Replace the current entry in the history
    		 * stack, instead of pushing on a new one
    		 */
    		navigate(to, options) {
    			const { state = {}, replace = false } = options || {};
    			action = replace ? REPLACE : PUSH;
    			if (isNumber(to)) {
    				if (options) {
    					warn(
    						NAVIGATE_ID,
    						"Navigation options (state or replace) are not supported, " +
    							"when passing a number as the first argument to navigate. " +
    							"They are ignored.",
    					);
    				}
    				action = POP;
    				source.history.go(to);
    			} else {
    				const keyedState = { ...state, _key: createGlobalId() };
    				// try...catch iOS Safari limits to 100 pushState calls
    				try {
    					source.history[replace ? "replaceState" : "pushState"](
    						keyedState,
    						"",
    						to,
    					);
    				} catch (e) {
    					source.location[replace ? "replace" : "assign"](to);
    				}
    			}

    			location = getLocation(source);
    			notifyListeners();
    		},
    	};
    }

    function createStackFrame(state, uri) {
    	return { ...createLocation(uri), state };
    }

    // Stores history entries in memory for testing or other platforms like Native
    function createMemorySource(initialPathname = "/") {
    	let index = 0;
    	let stack = [createStackFrame(null, initialPathname)];

    	return {
    		// This is just for testing...
    		get entries() {
    			return stack;
    		},
    		get location() {
    			return stack[index];
    		},
    		addEventListener() {},
    		removeEventListener() {},
    		history: {
    			get state() {
    				return stack[index].state;
    			},
    			pushState(state, title, uri) {
    				index++;
    				// Throw away anything in the stack with an index greater than the current index.
    				// This happens, when we go back using `go(-n)`. The index is now less than `stack.length`.
    				// If we call `go(+n)` the stack entries with an index greater than the current index can
    				// be reused.
    				// However, if we navigate to a path, instead of a number, we want to create a new branch
    				// of navigation.
    				stack = stack.slice(0, index);
    				stack.push(createStackFrame(state, uri));
    			},
    			replaceState(state, title, uri) {
    				stack[index] = createStackFrame(state, uri);
    			},
    			go(to) {
    				const newIndex = index + to;
    				if (newIndex < 0 || newIndex > stack.length - 1) {
    					return;
    				}
    				index = newIndex;
    			},
    		},
    	};
    }

    // Global history uses window.history as the source if available,
    // otherwise a memory history
    const canUseDOM = !!(
    	!isSSR &&
    	window.document &&
    	window.document.createElement
    );
    // Use memory history in iframes (for example in Svelte REPL)
    const isEmbeddedPage = !isSSR && window.location.origin === "null";
    const globalHistory = createHistory(
    	canUseDOM && !isEmbeddedPage ? window : createMemorySource(),
    );

    // We need to keep the focus candidate in a separate file, so svelte does
    // not update, when we mutate it.
    // Also, we need a single global reference, because taking focus needs to
    // work globally, even if we have multiple top level routers
    // eslint-disable-next-line import/no-mutable-exports
    let focusCandidate = null;

    // eslint-disable-next-line import/no-mutable-exports
    let initialNavigation = true;

    /**
     * Check if RouterA is above RouterB in the document
     * @param {number} routerIdA The first Routers id
     * @param {number} routerIdB The second Routers id
     */
    function isAbove(routerIdA, routerIdB) {
    	const routerMarkers = document.querySelectorAll("[data-svnav-router]");
    	for (let i = 0; i < routerMarkers.length; i++) {
    		const node = routerMarkers[i];
    		const currentId = Number(node.dataset.svnavRouter);
    		if (currentId === routerIdA) return true;
    		if (currentId === routerIdB) return false;
    	}
    	return false;
    }

    /**
     * Check if a Route candidate is the best choice to move focus to,
     * and store the best match.
     * @param {{
         level: number;
         routerId: number;
         route: {
           id: number;
           focusElement: import("svelte/store").Readable<Promise<Element>|null>;
         }
       }} item A Route candidate, that updated and is visible after a navigation
     */
    function pushFocusCandidate(item) {
    	if (
    		// Best candidate if it's the only candidate...
    		!focusCandidate ||
    		// Route is nested deeper, than previous candidate
    		// -> Route change was triggered in the deepest affected
    		// Route, so that's were focus should move to
    		item.level > focusCandidate.level ||
    		// If the level is identical, we want to focus the first Route in the document,
    		// so we pick the first Router lookin from page top to page bottom.
    		(item.level === focusCandidate.level &&
    			isAbove(item.routerId, focusCandidate.routerId))
    	) {
    		focusCandidate = item;
    	}
    }

    /**
     * Reset the focus candidate.
     */
    function clearFocusCandidate() {
    	focusCandidate = null;
    }

    function initialNavigationOccurred() {
    	initialNavigation = false;
    }

    /*
     * `focus` Adapted from https://github.com/oaf-project/oaf-side-effects/blob/master/src/index.ts
     *
     * https://github.com/oaf-project/oaf-side-effects/blob/master/LICENSE
     */
    function focus(elem) {
    	if (!elem) return false;
    	const TABINDEX = "tabindex";
    	try {
    		if (!elem.hasAttribute(TABINDEX)) {
    			elem.setAttribute(TABINDEX, "-1");
    			let unlisten;
    			// We remove tabindex after blur to avoid weird browser behavior
    			// where a mouse click can activate elements with tabindex="-1".
    			const blurListener = () => {
    				elem.removeAttribute(TABINDEX);
    				unlisten();
    			};
    			unlisten = addListener(elem, "blur", blurListener);
    		}
    		elem.focus();
    		return document.activeElement === elem;
    	} catch (e) {
    		// Apparently trying to focus a disabled element in IE can throw.
    		// See https://stackoverflow.com/a/1600194/2476884
    		return false;
    	}
    }

    function isEndMarker(elem, id) {
    	return Number(elem.dataset.svnavRouteEnd) === id;
    }

    function isHeading(elem) {
    	return /^H[1-6]$/i.test(elem.tagName);
    }

    function query(selector, parent = document) {
    	return parent.querySelector(selector);
    }

    function queryHeading(id) {
    	const marker = query(`[data-svnav-route-start="${id}"]`);
    	let current = marker.nextElementSibling;
    	while (!isEndMarker(current, id)) {
    		if (isHeading(current)) {
    			return current;
    		}
    		const heading = query("h1,h2,h3,h4,h5,h6", current);
    		if (heading) {
    			return heading;
    		}
    		current = current.nextElementSibling;
    	}
    	return null;
    }

    function handleFocus(route) {
    	Promise.resolve(get_store_value(route.focusElement)).then(elem => {
    		const focusElement = elem || queryHeading(route.id);
    		if (!focusElement) {
    			warn(
    				ROUTER_ID,
    				"Could not find an element to focus. " +
    					"You should always render a header for accessibility reasons, " +
    					'or set a custom focus element via the "useFocus" hook. ' +
    					"If you don't want this Route or Router to manage focus, " +
    					'pass "primary={false}" to it.',
    				route,
    				ROUTE_ID,
    			);
    		}
    		const headingFocused = focus(focusElement);
    		if (headingFocused) return;
    		focus(document.documentElement);
    	});
    }

    const createTriggerFocus = (a11yConfig, announcementText, location) => (
    	manageFocus,
    	announceNavigation,
    ) =>
    	// Wait until the dom is updated, so we can look for headings
    	tick().then(() => {
    		if (!focusCandidate || initialNavigation) {
    			initialNavigationOccurred();
    			return;
    		}
    		if (manageFocus) {
    			handleFocus(focusCandidate.route);
    		}
    		if (a11yConfig.announcements && announceNavigation) {
    			const { path, fullPath, meta, params, uri } = focusCandidate.route;
    			const announcementMessage = a11yConfig.createAnnouncement(
    				{ path, fullPath, meta, params, uri },
    				get_store_value(location),
    			);
    			Promise.resolve(announcementMessage).then(message => {
    				announcementText.set(message);
    			});
    		}
    		clearFocusCandidate();
    	});

    const visuallyHiddenStyle =
    	"position:fixed;" +
    	"top:-1px;" +
    	"left:0;" +
    	"width:1px;" +
    	"height:1px;" +
    	"padding:0;" +
    	"overflow:hidden;" +
    	"clip:rect(0,0,0,0);" +
    	"white-space:nowrap;" +
    	"border:0;";

    /* node_modules/svelte-navigator/src/Router.svelte generated by Svelte v3.50.0 */

    const file$n = "node_modules/svelte-navigator/src/Router.svelte";

    // (195:0) {#if isTopLevelRouter && manageFocus && a11yConfig.announcements}
    function create_if_block$1(ctx) {
    	let div;
    	let t;

    	const block = {
    		c: function create() {
    			div = element("div");
    			t = text(/*$announcementText*/ ctx[0]);
    			attr_dev(div, "role", "status");
    			attr_dev(div, "aria-atomic", "true");
    			attr_dev(div, "aria-live", "polite");
    			attr_dev(div, "style", visuallyHiddenStyle);
    			add_location(div, file$n, 195, 1, 5906);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*$announcementText*/ 1) set_data_dev(t, /*$announcementText*/ ctx[0]);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$1.name,
    		type: "if",
    		source: "(195:0) {#if isTopLevelRouter && manageFocus && a11yConfig.announcements}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$o(ctx) {
    	let div;
    	let t0;
    	let t1;
    	let if_block_anchor;
    	let current;
    	const default_slot_template = /*#slots*/ ctx[20].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[19], null);
    	let if_block = /*isTopLevelRouter*/ ctx[2] && /*manageFocus*/ ctx[4] && /*a11yConfig*/ ctx[1].announcements && create_if_block$1(ctx);

    	const block = {
    		c: function create() {
    			div = element("div");
    			t0 = space();
    			if (default_slot) default_slot.c();
    			t1 = space();
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    			set_style(div, "display", "none");
    			attr_dev(div, "aria-hidden", "true");
    			attr_dev(div, "data-svnav-router", /*routerId*/ ctx[3]);
    			add_location(div, file$n, 190, 0, 5750);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			insert_dev(target, t0, anchor);

    			if (default_slot) {
    				default_slot.m(target, anchor);
    			}

    			insert_dev(target, t1, anchor);
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (default_slot) {
    				if (default_slot.p && (!current || dirty[0] & /*$$scope*/ 524288)) {
    					update_slot_base(
    						default_slot,
    						default_slot_template,
    						ctx,
    						/*$$scope*/ ctx[19],
    						!current
    						? get_all_dirty_from_scope(/*$$scope*/ ctx[19])
    						: get_slot_changes(default_slot_template, /*$$scope*/ ctx[19], dirty, null),
    						null
    					);
    				}
    			}

    			if (/*isTopLevelRouter*/ ctx[2] && /*manageFocus*/ ctx[4] && /*a11yConfig*/ ctx[1].announcements) if_block.p(ctx, dirty);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if (detaching) detach_dev(t0);
    			if (default_slot) default_slot.d(detaching);
    			if (detaching) detach_dev(t1);
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$o.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    const createId$1 = createCounter();
    const defaultBasepath = "/";

    function instance$o($$self, $$props, $$invalidate) {
    	let $location;
    	let $activeRoute;
    	let $prevLocation;
    	let $routes;
    	let $announcementText;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Router', slots, ['default']);
    	let { basepath = defaultBasepath } = $$props;
    	let { url = null } = $$props;
    	let { history = globalHistory } = $$props;
    	let { primary = true } = $$props;
    	let { a11y = {} } = $$props;

    	const a11yConfig = {
    		createAnnouncement: route => `Navigated to ${route.uri}`,
    		announcements: true,
    		...a11y
    	};

    	// Remember the initial `basepath`, so we can fire a warning
    	// when the user changes it later
    	const initialBasepath = basepath;

    	const normalizedBasepath = normalizePath(basepath);
    	const locationContext = getContext(LOCATION);
    	const routerContext = getContext(ROUTER);
    	const isTopLevelRouter = !locationContext;
    	const routerId = createId$1();
    	const manageFocus = primary && !(routerContext && !routerContext.manageFocus);
    	const announcementText = writable("");
    	validate_store(announcementText, 'announcementText');
    	component_subscribe($$self, announcementText, value => $$invalidate(0, $announcementText = value));
    	const routes = writable([]);
    	validate_store(routes, 'routes');
    	component_subscribe($$self, routes, value => $$invalidate(18, $routes = value));
    	const activeRoute = writable(null);
    	validate_store(activeRoute, 'activeRoute');
    	component_subscribe($$self, activeRoute, value => $$invalidate(16, $activeRoute = value));

    	// Used in SSR to synchronously set that a Route is active.
    	let hasActiveRoute = false;

    	// Nesting level of router.
    	// We will need this to identify sibling routers, when moving
    	// focus on navigation, so we can focus the first possible router
    	const level = isTopLevelRouter ? 0 : routerContext.level + 1;

    	// If we're running an SSR we force the location to the `url` prop
    	const getInitialLocation = () => normalizeLocation(isSSR ? createLocation(url) : history.location, normalizedBasepath);

    	const location = isTopLevelRouter
    	? writable(getInitialLocation())
    	: locationContext;

    	validate_store(location, 'location');
    	component_subscribe($$self, location, value => $$invalidate(15, $location = value));
    	const prevLocation = writable($location);
    	validate_store(prevLocation, 'prevLocation');
    	component_subscribe($$self, prevLocation, value => $$invalidate(17, $prevLocation = value));
    	const triggerFocus = createTriggerFocus(a11yConfig, announcementText, location);
    	const createRouteFilter = routeId => routeList => routeList.filter(routeItem => routeItem.id !== routeId);

    	function registerRoute(route) {
    		if (isSSR) {
    			// In SSR we should set the activeRoute immediately if it is a match.
    			// If there are more Routes being registered after a match is found,
    			// we just skip them.
    			if (hasActiveRoute) {
    				return;
    			}

    			const matchingRoute = match(route, $location.pathname);

    			if (matchingRoute) {
    				hasActiveRoute = true;

    				// Return the match in SSR mode, so the matched Route can use it immediatly.
    				// Waiting for activeRoute to update does not work, because it updates
    				// after the Route is initialized
    				return matchingRoute; // eslint-disable-line consistent-return
    			}
    		} else {
    			routes.update(prevRoutes => {
    				// Remove an old version of the updated route,
    				// before pushing the new version
    				const nextRoutes = createRouteFilter(route.id)(prevRoutes);

    				nextRoutes.push(route);
    				return nextRoutes;
    			});
    		}
    	}

    	function unregisterRoute(routeId) {
    		routes.update(createRouteFilter(routeId));
    	}

    	if (!isTopLevelRouter && basepath !== defaultBasepath) {
    		warn(ROUTER_ID, 'Only top-level Routers can have a "basepath" prop. It is ignored.', { basepath });
    	}

    	if (isTopLevelRouter) {
    		// The topmost Router in the tree is responsible for updating
    		// the location store and supplying it through context.
    		onMount(() => {
    			const unlisten = history.listen(changedHistory => {
    				const normalizedLocation = normalizeLocation(changedHistory.location, normalizedBasepath);
    				prevLocation.set($location);
    				location.set(normalizedLocation);
    			});

    			return unlisten;
    		});

    		setContext(LOCATION, location);
    	}

    	setContext(ROUTER, {
    		activeRoute,
    		registerRoute,
    		unregisterRoute,
    		manageFocus,
    		level,
    		id: routerId,
    		history: isTopLevelRouter ? history : routerContext.history,
    		basepath: isTopLevelRouter
    		? normalizedBasepath
    		: routerContext.basepath
    	});

    	const writable_props = ['basepath', 'url', 'history', 'primary', 'a11y'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Router> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ('basepath' in $$props) $$invalidate(10, basepath = $$props.basepath);
    		if ('url' in $$props) $$invalidate(11, url = $$props.url);
    		if ('history' in $$props) $$invalidate(12, history = $$props.history);
    		if ('primary' in $$props) $$invalidate(13, primary = $$props.primary);
    		if ('a11y' in $$props) $$invalidate(14, a11y = $$props.a11y);
    		if ('$$scope' in $$props) $$invalidate(19, $$scope = $$props.$$scope);
    	};

    	$$self.$capture_state = () => ({
    		createCounter,
    		createId: createId$1,
    		getContext,
    		setContext,
    		onMount,
    		writable,
    		LOCATION,
    		ROUTER,
    		globalHistory,
    		normalizePath,
    		pick,
    		match,
    		normalizeLocation,
    		createLocation,
    		isSSR,
    		warn,
    		ROUTER_ID,
    		pushFocusCandidate,
    		visuallyHiddenStyle,
    		createTriggerFocus,
    		defaultBasepath,
    		basepath,
    		url,
    		history,
    		primary,
    		a11y,
    		a11yConfig,
    		initialBasepath,
    		normalizedBasepath,
    		locationContext,
    		routerContext,
    		isTopLevelRouter,
    		routerId,
    		manageFocus,
    		announcementText,
    		routes,
    		activeRoute,
    		hasActiveRoute,
    		level,
    		getInitialLocation,
    		location,
    		prevLocation,
    		triggerFocus,
    		createRouteFilter,
    		registerRoute,
    		unregisterRoute,
    		$location,
    		$activeRoute,
    		$prevLocation,
    		$routes,
    		$announcementText
    	});

    	$$self.$inject_state = $$props => {
    		if ('basepath' in $$props) $$invalidate(10, basepath = $$props.basepath);
    		if ('url' in $$props) $$invalidate(11, url = $$props.url);
    		if ('history' in $$props) $$invalidate(12, history = $$props.history);
    		if ('primary' in $$props) $$invalidate(13, primary = $$props.primary);
    		if ('a11y' in $$props) $$invalidate(14, a11y = $$props.a11y);
    		if ('hasActiveRoute' in $$props) hasActiveRoute = $$props.hasActiveRoute;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty[0] & /*basepath*/ 1024) {
    			if (basepath !== initialBasepath) {
    				warn(ROUTER_ID, 'You cannot change the "basepath" prop. It is ignored.');
    			}
    		}

    		if ($$self.$$.dirty[0] & /*$routes, $location*/ 294912) {
    			// This reactive statement will be run when the Router is created
    			// when there are no Routes and then again the following tick, so it
    			// will not find an active Route in SSR and in the browser it will only
    			// pick an active Route after all Routes have been registered.
    			{
    				const bestMatch = pick($routes, $location.pathname);
    				activeRoute.set(bestMatch);
    			}
    		}

    		if ($$self.$$.dirty[0] & /*$location, $prevLocation*/ 163840) {
    			// Manage focus and announce navigation to screen reader users
    			{
    				if (isTopLevelRouter) {
    					const hasHash = !!$location.hash;

    					// When a hash is present in the url, we skip focus management, because
    					// focusing a different element will prevent in-page jumps (See #3)
    					const shouldManageFocus = !hasHash && manageFocus;

    					// We don't want to make an announcement, when the hash changes,
    					// but the active route stays the same
    					const announceNavigation = !hasHash || $location.pathname !== $prevLocation.pathname;

    					triggerFocus(shouldManageFocus, announceNavigation);
    				}
    			}
    		}

    		if ($$self.$$.dirty[0] & /*$activeRoute*/ 65536) {
    			// Queue matched Route, so top level Router can decide which Route to focus.
    			// Non primary Routers should just be ignored
    			if (manageFocus && $activeRoute && $activeRoute.primary) {
    				pushFocusCandidate({ level, routerId, route: $activeRoute });
    			}
    		}
    	};

    	return [
    		$announcementText,
    		a11yConfig,
    		isTopLevelRouter,
    		routerId,
    		manageFocus,
    		announcementText,
    		routes,
    		activeRoute,
    		location,
    		prevLocation,
    		basepath,
    		url,
    		history,
    		primary,
    		a11y,
    		$location,
    		$activeRoute,
    		$prevLocation,
    		$routes,
    		$$scope,
    		slots
    	];
    }

    class Router extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(
    			this,
    			options,
    			instance$o,
    			create_fragment$o,
    			safe_not_equal,
    			{
    				basepath: 10,
    				url: 11,
    				history: 12,
    				primary: 13,
    				a11y: 14
    			},
    			null,
    			[-1, -1]
    		);

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Router",
    			options,
    			id: create_fragment$o.name
    		});
    	}

    	get basepath() {
    		throw new Error("<Router>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set basepath(value) {
    		throw new Error("<Router>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get url() {
    		throw new Error("<Router>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set url(value) {
    		throw new Error("<Router>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get history() {
    		throw new Error("<Router>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set history(value) {
    		throw new Error("<Router>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get primary() {
    		throw new Error("<Router>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set primary(value) {
    		throw new Error("<Router>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get a11y() {
    		throw new Error("<Router>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set a11y(value) {
    		throw new Error("<Router>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    var Router$1 = Router;

    /**
     * Check if a component or hook have been created outside of a
     * context providing component
     * @param {number} componentId
     * @param {*} props
     * @param {string?} ctxKey
     * @param {number?} ctxProviderId
     */
    function usePreflightCheck(
    	componentId,
    	props,
    	ctxKey = ROUTER,
    	ctxProviderId = ROUTER_ID,
    ) {
    	const ctx = getContext(ctxKey);
    	if (!ctx) {
    		fail(
    			componentId,
    			label =>
    				`You cannot use ${label} outside of a ${createLabel(ctxProviderId)}.`,
    			props,
    		);
    	}
    }

    const toReadonly = ctx => {
    	const { subscribe } = getContext(ctx);
    	return { subscribe };
    };

    /**
     * Access the current location via a readable store.
     * @returns {import("svelte/store").Readable<{
        pathname: string;
        search: string;
        hash: string;
        state: {};
      }>}
     *
     * @example
      ```html
      <script>
        import { useLocation } from "svelte-navigator";

        const location = useLocation();

        $: console.log($location);
        // {
        //   pathname: "/blog",
        //   search: "?id=123",
        //   hash: "#comments",
        //   state: {}
        // }
      </script>
      ```
     */
    function useLocation() {
    	usePreflightCheck(USE_LOCATION_ID);
    	return toReadonly(LOCATION);
    }

    /**
     * @typedef {{
        path: string;
        fullPath: string;
        uri: string;
        params: {};
      }} RouteMatch
     */

    /**
     * @typedef {import("svelte/store").Readable<RouteMatch|null>} RouteMatchStore
     */

    /**
     * Access the history of top level Router.
     */
    function useHistory() {
    	const { history } = getContext(ROUTER);
    	return history;
    }

    /**
     * Access the base of the parent Route.
     */
    function useRouteBase() {
    	const route = getContext(ROUTE);
    	return route ? derived(route, _route => _route.base) : writable("/");
    }

    /**
     * Resolve a given link relative to the current `Route` and the `Router`s `basepath`.
     * It is used under the hood in `Link` and `useNavigate`.
     * You can use it to manually resolve links, when using the `link` or `links` actions.
     *
     * @returns {(path: string) => string}
     *
     * @example
      ```html
      <script>
        import { link, useResolve } from "svelte-navigator";

        const resolve = useResolve();
        // `resolvedLink` will be resolved relative to its parent Route
        // and the Routers `basepath`
        const resolvedLink = resolve("relativePath");
      </script>

      <a href={resolvedLink} use:link>Relative link</a>
      ```
     */
    function useResolve() {
    	usePreflightCheck(USE_RESOLVE_ID);
    	const routeBase = useRouteBase();
    	const { basepath: appBase } = getContext(ROUTER);
    	/**
    	 * Resolves the path relative to the current route and basepath.
    	 *
    	 * @param {string} path The path to resolve
    	 * @returns {string} The resolved path
    	 */
    	const resolve = path => resolveLink(path, get_store_value(routeBase), appBase);
    	return resolve;
    }

    /**
     * A hook, that returns a context-aware version of `navigate`.
     * It will automatically resolve the given link relative to the current Route.
     * It will also resolve a link against the `basepath` of the Router.
     *
     * @example
      ```html
      <!-- App.svelte -->
      <script>
        import { link, Route } from "svelte-navigator";
        import RouteComponent from "./RouteComponent.svelte";
      </script>

      <Router>
        <Route path="route1">
          <RouteComponent />
        </Route>
        <!-- ... -->
      </Router>

      <!-- RouteComponent.svelte -->
      <script>
        import { useNavigate } from "svelte-navigator";

        const navigate = useNavigate();
      </script>

      <button on:click="{() => navigate('relativePath')}">
        go to /route1/relativePath
      </button>
      <button on:click="{() => navigate('/absolutePath')}">
        go to /absolutePath
      </button>
      ```
      *
      * @example
      ```html
      <!-- App.svelte -->
      <script>
        import { link, Route } from "svelte-navigator";
        import RouteComponent from "./RouteComponent.svelte";
      </script>

      <Router basepath="/base">
        <Route path="route1">
          <RouteComponent />
        </Route>
        <!-- ... -->
      </Router>

      <!-- RouteComponent.svelte -->
      <script>
        import { useNavigate } from "svelte-navigator";

        const navigate = useNavigate();
      </script>

      <button on:click="{() => navigate('relativePath')}">
        go to /base/route1/relativePath
      </button>
      <button on:click="{() => navigate('/absolutePath')}">
        go to /base/absolutePath
      </button>
      ```
     */
    function useNavigate() {
    	usePreflightCheck(USE_NAVIGATE_ID);
    	const resolve = useResolve();
    	const { navigate } = useHistory();
    	/**
    	 * Navigate to a new route.
    	 * Resolves the link relative to the current route and basepath.
    	 *
    	 * @param {string|number} to The path to navigate to.
    	 *
    	 * If `to` is a number we will navigate to the stack entry index + `to`
    	 * (-> `navigate(-1)`, is equivalent to hitting the back button of the browser)
    	 * @param {Object} options
    	 * @param {*} [options.state]
    	 * @param {boolean} [options.replace=false]
    	 */
    	const navigateRelative = (to, options) => {
    		// If to is a number, we navigate to the target stack entry via `history.go`.
    		// Otherwise resolve the link
    		const target = isNumber(to) ? to : resolve(to);
    		return navigate(target, options);
    	};
    	return navigateRelative;
    }

    /* node_modules/svelte-navigator/src/Route.svelte generated by Svelte v3.50.0 */
    const file$m = "node_modules/svelte-navigator/src/Route.svelte";

    const get_default_slot_changes = dirty => ({
    	params: dirty & /*$params*/ 16,
    	location: dirty & /*$location*/ 8
    });

    const get_default_slot_context = ctx => ({
    	params: isSSR ? get_store_value(/*params*/ ctx[9]) : /*$params*/ ctx[4],
    	location: /*$location*/ ctx[3],
    	navigate: /*navigate*/ ctx[10]
    });

    // (97:0) {#if isActive}
    function create_if_block(ctx) {
    	let router;
    	let current;

    	router = new Router$1({
    			props: {
    				primary: /*primary*/ ctx[1],
    				$$slots: { default: [create_default_slot$1] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(router.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(router, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const router_changes = {};
    			if (dirty & /*primary*/ 2) router_changes.primary = /*primary*/ ctx[1];

    			if (dirty & /*$$scope, component, $location, $params, $$restProps*/ 264217) {
    				router_changes.$$scope = { dirty, ctx };
    			}

    			router.$set(router_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(router.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(router.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(router, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(97:0) {#if isActive}",
    		ctx
    	});

    	return block;
    }

    // (113:2) {:else}
    function create_else_block(ctx) {
    	let current;
    	const default_slot_template = /*#slots*/ ctx[17].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[18], get_default_slot_context);

    	const block = {
    		c: function create() {
    			if (default_slot) default_slot.c();
    		},
    		m: function mount(target, anchor) {
    			if (default_slot) {
    				default_slot.m(target, anchor);
    			}

    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (default_slot) {
    				if (default_slot.p && (!current || dirty & /*$$scope, $params, $location*/ 262168)) {
    					update_slot_base(
    						default_slot,
    						default_slot_template,
    						ctx,
    						/*$$scope*/ ctx[18],
    						!current
    						? get_all_dirty_from_scope(/*$$scope*/ ctx[18])
    						: get_slot_changes(default_slot_template, /*$$scope*/ ctx[18], dirty, get_default_slot_changes),
    						get_default_slot_context
    					);
    				}
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (default_slot) default_slot.d(detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(113:2) {:else}",
    		ctx
    	});

    	return block;
    }

    // (105:2) {#if component !== null}
    function create_if_block_1(ctx) {
    	let switch_instance;
    	let switch_instance_anchor;
    	let current;

    	const switch_instance_spread_levels = [
    		{ location: /*$location*/ ctx[3] },
    		{ navigate: /*navigate*/ ctx[10] },
    		isSSR ? get_store_value(/*params*/ ctx[9]) : /*$params*/ ctx[4],
    		/*$$restProps*/ ctx[11]
    	];

    	var switch_value = /*component*/ ctx[0];

    	function switch_props(ctx) {
    		let switch_instance_props = {};

    		for (let i = 0; i < switch_instance_spread_levels.length; i += 1) {
    			switch_instance_props = assign(switch_instance_props, switch_instance_spread_levels[i]);
    		}

    		return {
    			props: switch_instance_props,
    			$$inline: true
    		};
    	}

    	if (switch_value) {
    		switch_instance = new switch_value(switch_props());
    	}

    	const block = {
    		c: function create() {
    			if (switch_instance) create_component(switch_instance.$$.fragment);
    			switch_instance_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if (switch_instance) {
    				mount_component(switch_instance, target, anchor);
    			}

    			insert_dev(target, switch_instance_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const switch_instance_changes = (dirty & /*$location, navigate, isSSR, get, params, $params, $$restProps*/ 3608)
    			? get_spread_update(switch_instance_spread_levels, [
    					dirty & /*$location*/ 8 && { location: /*$location*/ ctx[3] },
    					dirty & /*navigate*/ 1024 && { navigate: /*navigate*/ ctx[10] },
    					dirty & /*isSSR, get, params, $params*/ 528 && get_spread_object(isSSR ? get_store_value(/*params*/ ctx[9]) : /*$params*/ ctx[4]),
    					dirty & /*$$restProps*/ 2048 && get_spread_object(/*$$restProps*/ ctx[11])
    				])
    			: {};

    			if (switch_value !== (switch_value = /*component*/ ctx[0])) {
    				if (switch_instance) {
    					group_outros();
    					const old_component = switch_instance;

    					transition_out(old_component.$$.fragment, 1, 0, () => {
    						destroy_component(old_component, 1);
    					});

    					check_outros();
    				}

    				if (switch_value) {
    					switch_instance = new switch_value(switch_props());
    					create_component(switch_instance.$$.fragment);
    					transition_in(switch_instance.$$.fragment, 1);
    					mount_component(switch_instance, switch_instance_anchor.parentNode, switch_instance_anchor);
    				} else {
    					switch_instance = null;
    				}
    			} else if (switch_value) {
    				switch_instance.$set(switch_instance_changes);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			if (switch_instance) transition_in(switch_instance.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			if (switch_instance) transition_out(switch_instance.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(switch_instance_anchor);
    			if (switch_instance) destroy_component(switch_instance, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(105:2) {#if component !== null}",
    		ctx
    	});

    	return block;
    }

    // (98:1) <Router {primary}>
    function create_default_slot$1(ctx) {
    	let current_block_type_index;
    	let if_block;
    	let if_block_anchor;
    	let current;
    	const if_block_creators = [create_if_block_1, create_else_block];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*component*/ ctx[0] !== null) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	const block = {
    		c: function create() {
    			if_block.c();
    			if_block_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if_blocks[current_block_type_index].m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(ctx, dirty);
    			} else {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block = if_blocks[current_block_type_index];

    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				} else {
    					if_block.p(ctx, dirty);
    				}

    				transition_in(if_block, 1);
    				if_block.m(if_block_anchor.parentNode, if_block_anchor);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if_blocks[current_block_type_index].d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot$1.name,
    		type: "slot",
    		source: "(98:1) <Router {primary}>",
    		ctx
    	});

    	return block;
    }

    function create_fragment$n(ctx) {
    	let div0;
    	let t0;
    	let t1;
    	let div1;
    	let current;
    	let if_block = /*isActive*/ ctx[2] && create_if_block(ctx);

    	const block = {
    		c: function create() {
    			div0 = element("div");
    			t0 = space();
    			if (if_block) if_block.c();
    			t1 = space();
    			div1 = element("div");
    			set_style(div0, "display", "none");
    			attr_dev(div0, "aria-hidden", "true");
    			attr_dev(div0, "data-svnav-route-start", /*id*/ ctx[5]);
    			add_location(div0, file$m, 95, 0, 2622);
    			set_style(div1, "display", "none");
    			attr_dev(div1, "aria-hidden", "true");
    			attr_dev(div1, "data-svnav-route-end", /*id*/ ctx[5]);
    			add_location(div1, file$m, 121, 0, 3295);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div0, anchor);
    			insert_dev(target, t0, anchor);
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, div1, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (/*isActive*/ ctx[2]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);

    					if (dirty & /*isActive*/ 4) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(t1.parentNode, t1);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div0);
    			if (detaching) detach_dev(t0);
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(div1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$n.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    const createId = createCounter();

    function instance$n($$self, $$props, $$invalidate) {
    	let isActive;
    	const omit_props_names = ["path","component","meta","primary"];
    	let $$restProps = compute_rest_props($$props, omit_props_names);
    	let $activeRoute;
    	let $location;
    	let $parentBase;
    	let $params;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Route', slots, ['default']);
    	let { path = "" } = $$props;
    	let { component = null } = $$props;
    	let { meta = {} } = $$props;
    	let { primary = true } = $$props;
    	usePreflightCheck(ROUTE_ID, $$props);
    	const id = createId();
    	const { registerRoute, unregisterRoute, activeRoute } = getContext(ROUTER);
    	validate_store(activeRoute, 'activeRoute');
    	component_subscribe($$self, activeRoute, value => $$invalidate(15, $activeRoute = value));
    	const parentBase = useRouteBase();
    	validate_store(parentBase, 'parentBase');
    	component_subscribe($$self, parentBase, value => $$invalidate(16, $parentBase = value));
    	const location = useLocation();
    	validate_store(location, 'location');
    	component_subscribe($$self, location, value => $$invalidate(3, $location = value));
    	const focusElement = writable(null);

    	// In SSR we cannot wait for $activeRoute to update,
    	// so we use the match returned from `registerRoute` instead
    	let ssrMatch;

    	const route = writable();
    	const params = writable({});
    	validate_store(params, 'params');
    	component_subscribe($$self, params, value => $$invalidate(4, $params = value));
    	setContext(ROUTE, route);
    	setContext(ROUTE_PARAMS, params);
    	setContext(FOCUS_ELEM, focusElement);

    	// We need to call useNavigate after the route is set,
    	// so we can use the routes path for link resolution
    	const navigate = useNavigate();

    	// There is no need to unregister Routes in SSR since it will all be
    	// thrown away anyway
    	if (!isSSR) {
    		onDestroy(() => unregisterRoute(id));
    	}

    	$$self.$$set = $$new_props => {
    		$$invalidate(23, $$props = assign(assign({}, $$props), exclude_internal_props($$new_props)));
    		$$invalidate(11, $$restProps = compute_rest_props($$props, omit_props_names));
    		if ('path' in $$new_props) $$invalidate(12, path = $$new_props.path);
    		if ('component' in $$new_props) $$invalidate(0, component = $$new_props.component);
    		if ('meta' in $$new_props) $$invalidate(13, meta = $$new_props.meta);
    		if ('primary' in $$new_props) $$invalidate(1, primary = $$new_props.primary);
    		if ('$$scope' in $$new_props) $$invalidate(18, $$scope = $$new_props.$$scope);
    	};

    	$$self.$capture_state = () => ({
    		createCounter,
    		createId,
    		getContext,
    		onDestroy,
    		setContext,
    		writable,
    		get: get_store_value,
    		Router: Router$1,
    		ROUTER,
    		ROUTE,
    		ROUTE_PARAMS,
    		FOCUS_ELEM,
    		useLocation,
    		useNavigate,
    		useRouteBase,
    		usePreflightCheck,
    		isSSR,
    		extractBaseUri,
    		join,
    		ROUTE_ID,
    		path,
    		component,
    		meta,
    		primary,
    		id,
    		registerRoute,
    		unregisterRoute,
    		activeRoute,
    		parentBase,
    		location,
    		focusElement,
    		ssrMatch,
    		route,
    		params,
    		navigate,
    		isActive,
    		$activeRoute,
    		$location,
    		$parentBase,
    		$params
    	});

    	$$self.$inject_state = $$new_props => {
    		$$invalidate(23, $$props = assign(assign({}, $$props), $$new_props));
    		if ('path' in $$props) $$invalidate(12, path = $$new_props.path);
    		if ('component' in $$props) $$invalidate(0, component = $$new_props.component);
    		if ('meta' in $$props) $$invalidate(13, meta = $$new_props.meta);
    		if ('primary' in $$props) $$invalidate(1, primary = $$new_props.primary);
    		if ('ssrMatch' in $$props) $$invalidate(14, ssrMatch = $$new_props.ssrMatch);
    		if ('isActive' in $$props) $$invalidate(2, isActive = $$new_props.isActive);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*path, $parentBase, meta, $location, primary*/ 77834) {
    			{
    				// The route store will be re-computed whenever props, location or parentBase change
    				const isDefault = path === "";

    				const rawBase = join($parentBase, path);

    				const updatedRoute = {
    					id,
    					path,
    					meta,
    					// If no path prop is given, this Route will act as the default Route
    					// that is rendered if no other Route in the Router is a match
    					default: isDefault,
    					fullPath: isDefault ? "" : rawBase,
    					base: isDefault
    					? $parentBase
    					: extractBaseUri(rawBase, $location.pathname),
    					primary,
    					focusElement
    				};

    				route.set(updatedRoute);

    				// If we're in SSR mode and the Route matches,
    				// `registerRoute` will return the match
    				$$invalidate(14, ssrMatch = registerRoute(updatedRoute));
    			}
    		}

    		if ($$self.$$.dirty & /*ssrMatch, $activeRoute*/ 49152) {
    			$$invalidate(2, isActive = !!(ssrMatch || $activeRoute && $activeRoute.id === id));
    		}

    		if ($$self.$$.dirty & /*isActive, ssrMatch, $activeRoute*/ 49156) {
    			if (isActive) {
    				const { params: activeParams } = ssrMatch || $activeRoute;
    				params.set(activeParams);
    			}
    		}
    	};

    	$$props = exclude_internal_props($$props);

    	return [
    		component,
    		primary,
    		isActive,
    		$location,
    		$params,
    		id,
    		activeRoute,
    		parentBase,
    		location,
    		params,
    		navigate,
    		$$restProps,
    		path,
    		meta,
    		ssrMatch,
    		$activeRoute,
    		$parentBase,
    		slots,
    		$$scope
    	];
    }

    class Route extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$n, create_fragment$n, safe_not_equal, {
    			path: 12,
    			component: 0,
    			meta: 13,
    			primary: 1
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Route",
    			options,
    			id: create_fragment$n.name
    		});
    	}

    	get path() {
    		throw new Error("<Route>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set path(value) {
    		throw new Error("<Route>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get component() {
    		throw new Error("<Route>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set component(value) {
    		throw new Error("<Route>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get meta() {
    		throw new Error("<Route>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set meta(value) {
    		throw new Error("<Route>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get primary() {
    		throw new Error("<Route>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set primary(value) {
    		throw new Error("<Route>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    var Route$1 = Route;

    /* src/Dashboard.svelte generated by Svelte v3.50.0 */

    const file$l = "src/Dashboard.svelte";

    function create_fragment$m(ctx) {
    	let h3;

    	const block = {
    		c: function create() {
    			h3 = element("h3");
    			h3.textContent = "대시보드";
    			attr_dev(h3, "class", "head-text");
    			add_location(h3, file$l, 3, 0, 24);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h3, anchor);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h3);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$m.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$m($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Dashboard', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Dashboard> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class Dashboard extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$m, create_fragment$m, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Dashboard",
    			options,
    			id: create_fragment$m.name
    		});
    	}
    }

    /* src/Landing.svelte generated by Svelte v3.50.0 */

    const file$k = "src/Landing.svelte";

    function create_fragment$l(ctx) {
    	let h3;
    	let t1;
    	let div31;
    	let div11;
    	let div0;
    	let h40;
    	let t3;
    	let div10;
    	let div1;
    	let b0;
    	let t5;
    	let div2;
    	let input0;
    	let t6;
    	let div3;
    	let b1;
    	let t8;
    	let div5;
    	let div4;
    	let input1;
    	let t10;
    	let div6;
    	let b2;
    	let t12;
    	let div8;
    	let div7;
    	let input2;
    	let t14;
    	let div9;
    	let input3;
    	let t15;
    	let t16;
    	let div23;
    	let div12;
    	let h41;
    	let t18;
    	let div22;
    	let div13;
    	let b3;
    	let t20;
    	let div14;
    	let input4;
    	let t21;
    	let div15;
    	let b4;
    	let t23;
    	let div17;
    	let div16;
    	let input5;
    	let t25;
    	let div18;
    	let b5;
    	let t27;
    	let div20;
    	let div19;
    	let input6;
    	let t29;
    	let div21;
    	let input7;
    	let t30;
    	let t31;
    	let div30;
    	let div24;
    	let h42;
    	let t33;
    	let div29;
    	let div25;
    	let b6;
    	let t35;
    	let div26;
    	let input8;
    	let t36;
    	let div27;
    	let b7;
    	let t38;
    	let div28;
    	let input9;

    	const block = {
    		c: function create() {
    			h3 = element("h3");
    			h3.textContent = "랜딩 설정";
    			t1 = space();
    			div31 = element("div");
    			div11 = element("div");
    			div0 = element("div");
    			h40 = element("h4");
    			h40.textContent = "Android";
    			t3 = space();
    			div10 = element("div");
    			div1 = element("div");
    			b0 = element("b");
    			b0.textContent = "기본 URL (필수 입력사항)";
    			t5 = space();
    			div2 = element("div");
    			input0 = element("input");
    			t6 = space();
    			div3 = element("div");
    			b1 = element("b");
    			b1.textContent = "앱이 설치되었을 때";
    			t8 = space();
    			div5 = element("div");
    			div4 = element("div");
    			div4.textContent = "딥 링크 Scheme : ";
    			input1 = element("input");
    			t10 = space();
    			div6 = element("div");
    			b2 = element("b");
    			b2.textContent = "앱이 설치되지 않았을 때";
    			t12 = space();
    			div8 = element("div");
    			div7 = element("div");
    			div7.textContent = "패키지 이름 : ";
    			input2 = element("input");
    			t14 = space();
    			div9 = element("div");
    			input3 = element("input");
    			t15 = text("App Link를 사용합니다.");
    			t16 = space();
    			div23 = element("div");
    			div12 = element("div");
    			h41 = element("h4");
    			h41.textContent = "iOS";
    			t18 = space();
    			div22 = element("div");
    			div13 = element("div");
    			b3 = element("b");
    			b3.textContent = "기본 URL (필수 입력사항)";
    			t20 = space();
    			div14 = element("div");
    			input4 = element("input");
    			t21 = space();
    			div15 = element("div");
    			b4 = element("b");
    			b4.textContent = "앱이 설치되었을 때";
    			t23 = space();
    			div17 = element("div");
    			div16 = element("div");
    			div16.textContent = "딥 링크 Scheme : ";
    			input5 = element("input");
    			t25 = space();
    			div18 = element("div");
    			b5 = element("b");
    			b5.textContent = "앱이 설치되지 않았을 때";
    			t27 = space();
    			div20 = element("div");
    			div19 = element("div");
    			div19.textContent = "앱 스토어 ID : ";
    			input6 = element("input");
    			t29 = space();
    			div21 = element("div");
    			input7 = element("input");
    			t30 = text("Universal Link를 사용합니다.");
    			t31 = space();
    			div30 = element("div");
    			div24 = element("div");
    			h42 = element("h4");
    			h42.textContent = "PC";
    			t33 = space();
    			div29 = element("div");
    			div25 = element("div");
    			b6 = element("b");
    			b6.textContent = "기본 URL (필수 입력사항)";
    			t35 = space();
    			div26 = element("div");
    			input8 = element("input");
    			t36 = space();
    			div27 = element("div");
    			b7 = element("b");
    			b7.textContent = "앱 다운로드 페이지";
    			t38 = space();
    			div28 = element("div");
    			input9 = element("input");
    			attr_dev(h3, "class", "head-text");
    			add_location(h3, file$k, 3, 0, 24);
    			add_location(h40, file$k, 6, 13, 112);
    			add_location(div0, file$k, 6, 8, 107);
    			add_location(b0, file$k, 8, 32, 197);
    			attr_dev(div1, "class", "header");
    			add_location(div1, file$k, 8, 12, 177);
    			attr_dev(input0, "type", "textbox");
    			attr_dev(input0, "placeholder", "http://petri.app.co.kr");
    			add_location(input0, file$k, 10, 16, 282);
    			attr_dev(div2, "class", "link-textbox");
    			add_location(div2, file$k, 9, 12, 239);
    			add_location(b1, file$k, 12, 32, 394);
    			attr_dev(div3, "class", "header");
    			add_location(div3, file$k, 12, 12, 374);
    			attr_dev(div4, "class", "label");
    			add_location(div4, file$k, 14, 16, 473);
    			attr_dev(input1, "type", "textbox");
    			attr_dev(input1, "placeholder", "http://petri.app.co.kr");
    			add_location(input1, file$k, 14, 55, 512);
    			attr_dev(div5, "class", "link-textbox");
    			add_location(div5, file$k, 13, 12, 430);
    			add_location(b2, file$k, 16, 32, 624);
    			attr_dev(div6, "class", "header");
    			add_location(div6, file$k, 16, 12, 604);
    			attr_dev(div7, "class", "label");
    			add_location(div7, file$k, 18, 16, 706);
    			attr_dev(input2, "type", "textbox");
    			attr_dev(input2, "placeholder", "http://petri.app.co.kr");
    			add_location(input2, file$k, 18, 50, 740);
    			attr_dev(div8, "class", "link-textbox");
    			add_location(div8, file$k, 17, 12, 663);
    			attr_dev(input3, "type", "checkbox");
    			add_location(input3, file$k, 21, 16, 869);
    			attr_dev(div9, "class", "footer");
    			add_location(div9, file$k, 20, 12, 832);
    			attr_dev(div10, "class", "context");
    			add_location(div10, file$k, 7, 8, 143);
    			attr_dev(div11, "class", "cont");
    			add_location(div11, file$k, 5, 4, 80);
    			add_location(h41, file$k, 27, 13, 991);
    			add_location(div12, file$k, 27, 8, 986);
    			add_location(b3, file$k, 29, 32, 1072);
    			attr_dev(div13, "class", "header");
    			add_location(div13, file$k, 29, 12, 1052);
    			attr_dev(input4, "type", "textbox");
    			attr_dev(input4, "placeholder", "http://petri.app.co.kr");
    			add_location(input4, file$k, 31, 16, 1157);
    			attr_dev(div14, "class", "link-textbox");
    			add_location(div14, file$k, 30, 12, 1114);
    			add_location(b4, file$k, 33, 32, 1269);
    			attr_dev(div15, "class", "header");
    			add_location(div15, file$k, 33, 12, 1249);
    			attr_dev(div16, "class", "label");
    			add_location(div16, file$k, 35, 16, 1348);
    			attr_dev(input5, "type", "textbox");
    			attr_dev(input5, "placeholder", "http://petri.app.co.kr");
    			add_location(input5, file$k, 35, 55, 1387);
    			attr_dev(div17, "class", "link-textbox");
    			add_location(div17, file$k, 34, 12, 1305);
    			add_location(b5, file$k, 37, 32, 1499);
    			attr_dev(div18, "class", "header");
    			add_location(div18, file$k, 37, 12, 1479);
    			attr_dev(div19, "class", "label");
    			add_location(div19, file$k, 39, 16, 1581);
    			attr_dev(input6, "type", "textbox");
    			attr_dev(input6, "placeholder", "http://petri.app.co.kr");
    			add_location(input6, file$k, 39, 52, 1617);
    			attr_dev(div20, "class", "link-textbox");
    			add_location(div20, file$k, 38, 12, 1538);
    			attr_dev(input7, "type", "checkbox");
    			add_location(input7, file$k, 42, 16, 1746);
    			attr_dev(div21, "class", "footer");
    			add_location(div21, file$k, 41, 12, 1709);
    			attr_dev(div22, "class", "context");
    			add_location(div22, file$k, 28, 8, 1018);
    			attr_dev(div23, "class", "cont");
    			add_location(div23, file$k, 26, 4, 959);
    			add_location(h42, file$k, 48, 13, 1882);
    			add_location(div24, file$k, 48, 8, 1877);
    			add_location(b6, file$k, 50, 32, 1970);
    			attr_dev(div25, "class", "header");
    			add_location(div25, file$k, 50, 12, 1950);
    			attr_dev(input8, "type", "textbox");
    			attr_dev(input8, "placeholder", "http://petri.app.co.kr");
    			add_location(input8, file$k, 52, 16, 2055);
    			attr_dev(div26, "class", "link-textbox");
    			add_location(div26, file$k, 51, 12, 2012);
    			add_location(b7, file$k, 54, 32, 2167);
    			attr_dev(div27, "class", "header");
    			add_location(div27, file$k, 54, 12, 2147);
    			attr_dev(input9, "type", "textbox");
    			attr_dev(input9, "placeholder", "http://petri.app.co.kr");
    			add_location(input9, file$k, 56, 16, 2246);
    			attr_dev(div28, "class", "link-textbox");
    			add_location(div28, file$k, 55, 12, 2203);
    			attr_dev(div29, "class", "context desktop");
    			add_location(div29, file$k, 49, 8, 1908);
    			attr_dev(div30, "class", "cont desktop");
    			add_location(div30, file$k, 47, 4, 1842);
    			attr_dev(div31, "class", "land");
    			add_location(div31, file$k, 4, 0, 57);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h3, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, div31, anchor);
    			append_dev(div31, div11);
    			append_dev(div11, div0);
    			append_dev(div0, h40);
    			append_dev(div11, t3);
    			append_dev(div11, div10);
    			append_dev(div10, div1);
    			append_dev(div1, b0);
    			append_dev(div10, t5);
    			append_dev(div10, div2);
    			append_dev(div2, input0);
    			append_dev(div10, t6);
    			append_dev(div10, div3);
    			append_dev(div3, b1);
    			append_dev(div10, t8);
    			append_dev(div10, div5);
    			append_dev(div5, div4);
    			append_dev(div5, input1);
    			append_dev(div10, t10);
    			append_dev(div10, div6);
    			append_dev(div6, b2);
    			append_dev(div10, t12);
    			append_dev(div10, div8);
    			append_dev(div8, div7);
    			append_dev(div8, input2);
    			append_dev(div10, t14);
    			append_dev(div10, div9);
    			append_dev(div9, input3);
    			append_dev(div9, t15);
    			append_dev(div31, t16);
    			append_dev(div31, div23);
    			append_dev(div23, div12);
    			append_dev(div12, h41);
    			append_dev(div23, t18);
    			append_dev(div23, div22);
    			append_dev(div22, div13);
    			append_dev(div13, b3);
    			append_dev(div22, t20);
    			append_dev(div22, div14);
    			append_dev(div14, input4);
    			append_dev(div22, t21);
    			append_dev(div22, div15);
    			append_dev(div15, b4);
    			append_dev(div22, t23);
    			append_dev(div22, div17);
    			append_dev(div17, div16);
    			append_dev(div17, input5);
    			append_dev(div22, t25);
    			append_dev(div22, div18);
    			append_dev(div18, b5);
    			append_dev(div22, t27);
    			append_dev(div22, div20);
    			append_dev(div20, div19);
    			append_dev(div20, input6);
    			append_dev(div22, t29);
    			append_dev(div22, div21);
    			append_dev(div21, input7);
    			append_dev(div21, t30);
    			append_dev(div31, t31);
    			append_dev(div31, div30);
    			append_dev(div30, div24);
    			append_dev(div24, h42);
    			append_dev(div30, t33);
    			append_dev(div30, div29);
    			append_dev(div29, div25);
    			append_dev(div25, b6);
    			append_dev(div29, t35);
    			append_dev(div29, div26);
    			append_dev(div26, input8);
    			append_dev(div29, t36);
    			append_dev(div29, div27);
    			append_dev(div27, b7);
    			append_dev(div29, t38);
    			append_dev(div29, div28);
    			append_dev(div28, input9);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h3);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(div31);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$l.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$l($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Landing', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Landing> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class Landing extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$l, create_fragment$l, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Landing",
    			options,
    			id: create_fragment$l.name
    		});
    	}
    }

    /* src/Campaign.svelte generated by Svelte v3.50.0 */

    const file$j = "src/Campaign.svelte";

    function create_fragment$k(ctx) {
    	let h3;
    	let t1;
    	let table;
    	let thead;
    	let td0;
    	let t3;
    	let td1;
    	let t5;
    	let td2;
    	let t7;
    	let td3;
    	let t9;
    	let td4;
    	let t11;
    	let td5;
    	let t12;
    	let tbody;
    	let tr0;
    	let td6;
    	let t14;
    	let td7;
    	let t16;
    	let td8;
    	let t17;
    	let td9;
    	let t19;
    	let td10;
    	let t21;
    	let td11;
    	let a0;
    	let t23;
    	let tr1;
    	let td12;
    	let t25;
    	let td13;
    	let t27;
    	let td14;
    	let t28;
    	let td15;
    	let t30;
    	let td16;
    	let t32;
    	let td17;
    	let a1;
    	let t34;
    	let tr2;
    	let td18;
    	let t36;
    	let td19;
    	let t38;
    	let td20;
    	let t39;
    	let td21;
    	let t41;
    	let td22;
    	let t43;
    	let td23;
    	let a2;
    	let t45;
    	let tr3;
    	let td24;
    	let t47;
    	let td25;
    	let t49;
    	let td26;
    	let t50;
    	let td27;
    	let t52;
    	let td28;
    	let t54;
    	let td29;
    	let a3;
    	let t56;
    	let tr4;
    	let td30;
    	let t58;
    	let td31;
    	let t60;
    	let td32;
    	let t61;
    	let td33;
    	let t63;
    	let td34;
    	let t65;
    	let td35;
    	let a4;

    	const block = {
    		c: function create() {
    			h3 = element("h3");
    			h3.textContent = "캠페인 설정";
    			t1 = space();
    			table = element("table");
    			thead = element("thead");
    			td0 = element("td");
    			td0.textContent = "캠페인 이름";
    			t3 = space();
    			td1 = element("td");
    			td1.textContent = "파트너";
    			t5 = space();
    			td2 = element("td");
    			td2.textContent = "포스트백 설정";
    			t7 = space();
    			td3 = element("td");
    			td3.textContent = "수정 날짜/시각";
    			t9 = space();
    			td4 = element("td");
    			td4.textContent = "생성 날짜/시각";
    			t11 = space();
    			td5 = element("td");
    			t12 = space();
    			tbody = element("tbody");
    			tr0 = element("tr");
    			td6 = element("td");
    			td6.textContent = "모비온";
    			t14 = space();
    			td7 = element("td");
    			td7.textContent = "구글 애즈";
    			t16 = space();
    			td8 = element("td");
    			t17 = space();
    			td9 = element("td");
    			td9.textContent = "2022-09-02 11:14";
    			t19 = space();
    			td10 = element("td");
    			td10.textContent = "2022-09-05 12:01";
    			t21 = space();
    			td11 = element("td");
    			a0 = element("a");
    			a0.textContent = "상세 보기";
    			t23 = space();
    			tr1 = element("tr");
    			td12 = element("td");
    			td12.textContent = "performance_NCPI";
    			t25 = space();
    			td13 = element("td");
    			td13.textContent = "구글 애즈";
    			t27 = space();
    			td14 = element("td");
    			t28 = space();
    			td15 = element("td");
    			td15.textContent = "2022-09-02 11:14";
    			t30 = space();
    			td16 = element("td");
    			td16.textContent = "2022-09-05 12:01";
    			t32 = space();
    			td17 = element("td");
    			a1 = element("a");
    			a1.textContent = "상세 보기";
    			t34 = space();
    			tr2 = element("tr");
    			td18 = element("td");
    			td18.textContent = "Naver Search AD";
    			t36 = space();
    			td19 = element("td");
    			td19.textContent = "네이버";
    			t38 = space();
    			td20 = element("td");
    			t39 = space();
    			td21 = element("td");
    			td21.textContent = "2022-09-02 11:14";
    			t41 = space();
    			td22 = element("td");
    			td22.textContent = "2022-09-05 12:01";
    			t43 = space();
    			td23 = element("td");
    			a2 = element("a");
    			a2.textContent = "상세 보기";
    			t45 = space();
    			tr3 = element("tr");
    			td24 = element("td");
    			td24.textContent = "facebook";
    			t47 = space();
    			td25 = element("td");
    			td25.textContent = "페이스북";
    			t49 = space();
    			td26 = element("td");
    			t50 = space();
    			td27 = element("td");
    			td27.textContent = "2022-09-02 11:14";
    			t52 = space();
    			td28 = element("td");
    			td28.textContent = "2022-09-05 12:01";
    			t54 = space();
    			td29 = element("td");
    			a3 = element("a");
    			a3.textContent = "상세 보기";
    			t56 = space();
    			tr4 = element("tr");
    			td30 = element("td");
    			td30.textContent = "performance_NCPI";
    			t58 = space();
    			td31 = element("td");
    			td31.textContent = "구글 애즈";
    			t60 = space();
    			td32 = element("td");
    			t61 = space();
    			td33 = element("td");
    			td33.textContent = "2022-09-02 11:14";
    			t63 = space();
    			td34 = element("td");
    			td34.textContent = "2022-09-05 12:01";
    			t65 = space();
    			td35 = element("td");
    			a4 = element("a");
    			a4.textContent = "상세 보기";
    			attr_dev(h3, "class", "head-text");
    			add_location(h3, file$j, 2, 0, 19);
    			add_location(td0, file$j, 5, 8, 103);
    			add_location(td1, file$j, 6, 8, 127);
    			add_location(td2, file$j, 7, 8, 148);
    			add_location(td3, file$j, 8, 8, 173);
    			add_location(td4, file$j, 9, 8, 199);
    			add_location(td5, file$j, 10, 8, 225);
    			add_location(thead, file$j, 4, 4, 87);
    			add_location(td6, file$j, 14, 12, 285);
    			add_location(td7, file$j, 15, 12, 310);
    			add_location(td8, file$j, 16, 12, 337);
    			add_location(td9, file$j, 17, 12, 359);
    			add_location(td10, file$j, 18, 12, 397);
    			attr_dev(a0, "href", "/campaign-info");
    			add_location(a0, file$j, 19, 16, 439);
    			add_location(td11, file$j, 19, 12, 435);
    			add_location(tr0, file$j, 13, 8, 268);
    			add_location(td12, file$j, 22, 12, 518);
    			add_location(td13, file$j, 23, 12, 556);
    			add_location(td14, file$j, 24, 12, 583);
    			add_location(td15, file$j, 25, 12, 605);
    			add_location(td16, file$j, 26, 12, 643);
    			attr_dev(a1, "href", "/campaign-info");
    			add_location(a1, file$j, 27, 16, 685);
    			add_location(td17, file$j, 27, 12, 681);
    			add_location(tr1, file$j, 21, 8, 501);
    			add_location(td18, file$j, 30, 12, 764);
    			add_location(td19, file$j, 31, 12, 801);
    			add_location(td20, file$j, 32, 12, 826);
    			add_location(td21, file$j, 33, 12, 848);
    			add_location(td22, file$j, 34, 12, 886);
    			attr_dev(a2, "href", "/campaign-info");
    			add_location(a2, file$j, 35, 16, 928);
    			add_location(td23, file$j, 35, 12, 924);
    			add_location(tr2, file$j, 29, 8, 747);
    			add_location(td24, file$j, 38, 12, 1007);
    			add_location(td25, file$j, 39, 12, 1037);
    			add_location(td26, file$j, 40, 12, 1063);
    			add_location(td27, file$j, 41, 12, 1085);
    			add_location(td28, file$j, 42, 12, 1123);
    			attr_dev(a3, "href", "/campaign-info");
    			add_location(a3, file$j, 43, 16, 1165);
    			add_location(td29, file$j, 43, 12, 1161);
    			add_location(tr3, file$j, 37, 8, 990);
    			add_location(td30, file$j, 46, 12, 1244);
    			add_location(td31, file$j, 47, 12, 1282);
    			add_location(td32, file$j, 48, 12, 1309);
    			add_location(td33, file$j, 49, 12, 1331);
    			add_location(td34, file$j, 50, 12, 1369);
    			attr_dev(a4, "href", "/campaign-info");
    			add_location(a4, file$j, 51, 16, 1411);
    			add_location(td35, file$j, 51, 12, 1407);
    			add_location(tr4, file$j, 45, 8, 1227);
    			add_location(tbody, file$j, 12, 4, 252);
    			attr_dev(table, "class", "campaign-list");
    			add_location(table, file$j, 3, 0, 53);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h3, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, table, anchor);
    			append_dev(table, thead);
    			append_dev(thead, td0);
    			append_dev(thead, t3);
    			append_dev(thead, td1);
    			append_dev(thead, t5);
    			append_dev(thead, td2);
    			append_dev(thead, t7);
    			append_dev(thead, td3);
    			append_dev(thead, t9);
    			append_dev(thead, td4);
    			append_dev(thead, t11);
    			append_dev(thead, td5);
    			append_dev(table, t12);
    			append_dev(table, tbody);
    			append_dev(tbody, tr0);
    			append_dev(tr0, td6);
    			append_dev(tr0, t14);
    			append_dev(tr0, td7);
    			append_dev(tr0, t16);
    			append_dev(tr0, td8);
    			append_dev(tr0, t17);
    			append_dev(tr0, td9);
    			append_dev(tr0, t19);
    			append_dev(tr0, td10);
    			append_dev(tr0, t21);
    			append_dev(tr0, td11);
    			append_dev(td11, a0);
    			append_dev(tbody, t23);
    			append_dev(tbody, tr1);
    			append_dev(tr1, td12);
    			append_dev(tr1, t25);
    			append_dev(tr1, td13);
    			append_dev(tr1, t27);
    			append_dev(tr1, td14);
    			append_dev(tr1, t28);
    			append_dev(tr1, td15);
    			append_dev(tr1, t30);
    			append_dev(tr1, td16);
    			append_dev(tr1, t32);
    			append_dev(tr1, td17);
    			append_dev(td17, a1);
    			append_dev(tbody, t34);
    			append_dev(tbody, tr2);
    			append_dev(tr2, td18);
    			append_dev(tr2, t36);
    			append_dev(tr2, td19);
    			append_dev(tr2, t38);
    			append_dev(tr2, td20);
    			append_dev(tr2, t39);
    			append_dev(tr2, td21);
    			append_dev(tr2, t41);
    			append_dev(tr2, td22);
    			append_dev(tr2, t43);
    			append_dev(tr2, td23);
    			append_dev(td23, a2);
    			append_dev(tbody, t45);
    			append_dev(tbody, tr3);
    			append_dev(tr3, td24);
    			append_dev(tr3, t47);
    			append_dev(tr3, td25);
    			append_dev(tr3, t49);
    			append_dev(tr3, td26);
    			append_dev(tr3, t50);
    			append_dev(tr3, td27);
    			append_dev(tr3, t52);
    			append_dev(tr3, td28);
    			append_dev(tr3, t54);
    			append_dev(tr3, td29);
    			append_dev(td29, a3);
    			append_dev(tbody, t56);
    			append_dev(tbody, tr4);
    			append_dev(tr4, td30);
    			append_dev(tr4, t58);
    			append_dev(tr4, td31);
    			append_dev(tr4, t60);
    			append_dev(tr4, td32);
    			append_dev(tr4, t61);
    			append_dev(tr4, td33);
    			append_dev(tr4, t63);
    			append_dev(tr4, td34);
    			append_dev(tr4, t65);
    			append_dev(tr4, td35);
    			append_dev(td35, a4);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h3);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(table);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$k.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$k($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Campaign', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Campaign> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class Campaign extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$k, create_fragment$k, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Campaign",
    			options,
    			id: create_fragment$k.name
    		});
    	}
    }

    /* src/CampaignInfo.svelte generated by Svelte v3.50.0 */

    const file$i = "src/CampaignInfo.svelte";

    function create_fragment$j(ctx) {
    	let ul;
    	let li;
    	let a0;
    	let t1;
    	let a1;
    	let t3;
    	let a2;
    	let t5;
    	let a3;

    	const block = {
    		c: function create() {
    			ul = element("ul");
    			li = element("li");
    			a0 = element("a");
    			a0.textContent = "트래킹 링크";
    			t1 = space();
    			a1 = element("a");
    			a1.textContent = "KPI 목표 설정";
    			t3 = space();
    			a2 = element("a");
    			a2.textContent = "포스트백 설정";
    			t5 = space();
    			a3 = element("a");
    			a3.textContent = "프로드 설정";
    			attr_dev(a0, "class", "nav-link active");
    			attr_dev(a0, "href", "#");
    			add_location(a0, file$i, 7, 6, 126);
    			attr_dev(a1, "class", "nav-link active");
    			attr_dev(a1, "href", "#");
    			add_location(a1, file$i, 8, 6, 179);
    			attr_dev(a2, "class", "nav-link active");
    			attr_dev(a2, "href", "#");
    			add_location(a2, file$i, 9, 6, 235);
    			attr_dev(a3, "class", "nav-link active");
    			attr_dev(a3, "href", "#");
    			add_location(a3, file$i, 10, 6, 289);
    			attr_dev(li, "class", "nav-item");
    			add_location(li, file$i, 5, 2, 46);
    			attr_dev(ul, "class", "nav");
    			add_location(ul, file$i, 4, 1, 27);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, ul, anchor);
    			append_dev(ul, li);
    			append_dev(li, a0);
    			append_dev(li, t1);
    			append_dev(li, a1);
    			append_dev(li, t3);
    			append_dev(li, a2);
    			append_dev(li, t5);
    			append_dev(li, a3);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(ul);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$j.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$j($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('CampaignInfo', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<CampaignInfo> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class CampaignInfo extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$j, create_fragment$j, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "CampaignInfo",
    			options,
    			id: create_fragment$j.name
    		});
    	}
    }

    /* src/PartnerSignUp.svelte generated by Svelte v3.50.0 */

    const file$h = "src/PartnerSignUp.svelte";

    function create_fragment$i(ctx) {
    	let div15;
    	let div14;
    	let div13;
    	let div0;
    	let h5;
    	let t1;
    	let button0;
    	let span;
    	let t3;
    	let div11;
    	let div1;
    	let t5;
    	let div2;
    	let input0;
    	let t6;
    	let div3;
    	let t8;
    	let div4;
    	let input1;
    	let t9;
    	let div5;
    	let t11;
    	let div6;
    	let input2;
    	let t12;
    	let div7;
    	let t14;
    	let div8;
    	let input3;
    	let t15;
    	let div9;
    	let t17;
    	let div10;
    	let textarea;
    	let t18;
    	let div12;
    	let button1;
    	let t20;
    	let button2;

    	const block = {
    		c: function create() {
    			div15 = element("div");
    			div14 = element("div");
    			div13 = element("div");
    			div0 = element("div");
    			h5 = element("h5");
    			h5.textContent = "파트너 등록";
    			t1 = space();
    			button0 = element("button");
    			span = element("span");
    			span.textContent = "×";
    			t3 = space();
    			div11 = element("div");
    			div1 = element("div");
    			div1.textContent = "회사 혹은 플랫폼 이름";
    			t5 = space();
    			div2 = element("div");
    			input0 = element("input");
    			t6 = space();
    			div3 = element("div");
    			div3.textContent = "매니저 성함";
    			t8 = space();
    			div4 = element("div");
    			input1 = element("input");
    			t9 = space();
    			div5 = element("div");
    			div5.textContent = "매니저 이메일";
    			t11 = space();
    			div6 = element("div");
    			input2 = element("input");
    			t12 = space();
    			div7 = element("div");
    			div7.textContent = "매니저 연락처";
    			t14 = space();
    			div8 = element("div");
    			input3 = element("input");
    			t15 = space();
    			div9 = element("div");
    			div9.textContent = "설명";
    			t17 = space();
    			div10 = element("div");
    			textarea = element("textarea");
    			t18 = space();
    			div12 = element("div");
    			button1 = element("button");
    			button1.textContent = "등록";
    			t20 = space();
    			button2 = element("button");
    			button2.textContent = "닫기";
    			attr_dev(h5, "class", "modal-title");
    			add_location(h5, file$h, 4, 10, 194);
    			attr_dev(span, "aria-hidden", "true");
    			add_location(span, file$h, 6, 12, 329);
    			attr_dev(button0, "type", "button");
    			attr_dev(button0, "class", "close");
    			attr_dev(button0, "data-dismiss", "modal");
    			attr_dev(button0, "aria-label", "Close");
    			add_location(button0, file$h, 5, 10, 240);
    			attr_dev(div0, "class", "modal-header");
    			add_location(div0, file$h, 3, 8, 157);
    			attr_dev(div1, "class", "label");
    			add_location(div1, file$h, 10, 11, 448);
    			attr_dev(input0, "type", "textbox");
    			add_location(input0, file$h, 12, 15, 532);
    			attr_dev(div2, "class", "text");
    			add_location(div2, file$h, 11, 11, 498);
    			attr_dev(div3, "class", "label");
    			add_location(div3, file$h, 14, 11, 586);
    			attr_dev(input1, "type", "textbox");
    			add_location(input1, file$h, 16, 15, 664);
    			attr_dev(div4, "class", "text");
    			add_location(div4, file$h, 15, 11, 630);
    			attr_dev(div5, "class", "label");
    			add_location(div5, file$h, 18, 12, 719);
    			attr_dev(input2, "type", "textbox");
    			add_location(input2, file$h, 20, 15, 799);
    			attr_dev(div6, "class", "text");
    			add_location(div6, file$h, 19, 12, 765);
    			attr_dev(div7, "class", "label");
    			add_location(div7, file$h, 22, 12, 854);
    			attr_dev(input3, "type", "textbox");
    			add_location(input3, file$h, 24, 15, 934);
    			attr_dev(div8, "class", "text");
    			add_location(div8, file$h, 23, 12, 900);
    			attr_dev(div9, "class", "label");
    			add_location(div9, file$h, 26, 12, 989);
    			add_location(textarea, file$h, 28, 15, 1064);
    			attr_dev(div10, "class", "text");
    			add_location(div10, file$h, 27, 12, 1030);
    			attr_dev(div11, "class", "modal-body");
    			add_location(div11, file$h, 9, 8, 412);
    			attr_dev(button1, "type", "button");
    			attr_dev(button1, "class", "btn btn-primary");
    			attr_dev(button1, "data-dismiss", "modal");
    			add_location(button1, file$h, 32, 12, 1157);
    			attr_dev(button2, "type", "button");
    			attr_dev(button2, "class", "btn btn-secondary");
    			attr_dev(button2, "data-dismiss", "modal");
    			add_location(button2, file$h, 33, 12, 1248);
    			attr_dev(div12, "class", "modal-footer");
    			add_location(div12, file$h, 31, 8, 1118);
    			attr_dev(div13, "class", "modal-content");
    			add_location(div13, file$h, 2, 6, 121);
    			attr_dev(div14, "class", "modal-dialog");
    			attr_dev(div14, "role", "document");
    			add_location(div14, file$h, 1, 4, 72);
    			attr_dev(div15, "class", "modal partner");
    			attr_dev(div15, "tabindex", "-1");
    			attr_dev(div15, "role", "dialog");
    			attr_dev(div15, "id", "signup");
    			add_location(div15, file$h, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div15, anchor);
    			append_dev(div15, div14);
    			append_dev(div14, div13);
    			append_dev(div13, div0);
    			append_dev(div0, h5);
    			append_dev(div0, t1);
    			append_dev(div0, button0);
    			append_dev(button0, span);
    			append_dev(div13, t3);
    			append_dev(div13, div11);
    			append_dev(div11, div1);
    			append_dev(div11, t5);
    			append_dev(div11, div2);
    			append_dev(div2, input0);
    			append_dev(div11, t6);
    			append_dev(div11, div3);
    			append_dev(div11, t8);
    			append_dev(div11, div4);
    			append_dev(div4, input1);
    			append_dev(div11, t9);
    			append_dev(div11, div5);
    			append_dev(div11, t11);
    			append_dev(div11, div6);
    			append_dev(div6, input2);
    			append_dev(div11, t12);
    			append_dev(div11, div7);
    			append_dev(div11, t14);
    			append_dev(div11, div8);
    			append_dev(div8, input3);
    			append_dev(div11, t15);
    			append_dev(div11, div9);
    			append_dev(div11, t17);
    			append_dev(div11, div10);
    			append_dev(div10, textarea);
    			append_dev(div13, t18);
    			append_dev(div13, div12);
    			append_dev(div12, button1);
    			append_dev(div12, t20);
    			append_dev(div12, button2);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div15);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$i.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$i($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('PartnerSignUp', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<PartnerSignUp> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class PartnerSignUp extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$i, create_fragment$i, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "PartnerSignUp",
    			options,
    			id: create_fragment$i.name
    		});
    	}
    }

    /* src/Partner.svelte generated by Svelte v3.50.0 */
    const file$g = "src/Partner.svelte";

    function create_fragment$h(ctx) {
    	let h3;
    	let t1;
    	let table;
    	let thead;
    	let td0;
    	let t3;
    	let td1;
    	let t5;
    	let td2;
    	let t7;
    	let td3;
    	let t8;
    	let tbody;
    	let tr0;
    	let td4;
    	let t9;
    	let td5;
    	let t11;
    	let td6;
    	let t13;
    	let td7;
    	let span0;
    	let t15;
    	let tr1;
    	let td8;
    	let t16;
    	let td9;
    	let t18;
    	let td10;
    	let t20;
    	let td11;
    	let span1;
    	let t22;
    	let tr2;
    	let td12;
    	let t23;
    	let td13;
    	let t25;
    	let td14;
    	let span2;
    	let t27;
    	let td15;
    	let span3;
    	let t29;
    	let tr3;
    	let td16;
    	let t30;
    	let td17;
    	let t32;
    	let td18;
    	let t34;
    	let td19;
    	let span4;
    	let t36;
    	let tr4;
    	let td20;
    	let t37;
    	let td21;
    	let t39;
    	let td22;
    	let t41;
    	let td23;
    	let span5;
    	let t43;
    	let tr5;
    	let td24;
    	let t44;
    	let td25;
    	let t46;
    	let td26;
    	let t48;
    	let td27;
    	let span6;
    	let t50;
    	let tr6;
    	let td28;
    	let t51;
    	let td29;
    	let t53;
    	let td30;
    	let t55;
    	let td31;
    	let span7;
    	let t57;
    	let tr7;
    	let td32;
    	let t58;
    	let td33;
    	let t60;
    	let td34;
    	let t62;
    	let td35;
    	let span8;
    	let t64;
    	let button;
    	let t66;
    	let partnersignup;
    	let current;
    	let mounted;
    	let dispose;
    	partnersignup = new PartnerSignUp({ $$inline: true });

    	const block = {
    		c: function create() {
    			h3 = element("h3");
    			h3.textContent = "광고 파트너";
    			t1 = space();
    			table = element("table");
    			thead = element("thead");
    			td0 = element("td");
    			td0.textContent = "아이콘";
    			t3 = space();
    			td1 = element("td");
    			td1.textContent = "파트너 이름";
    			t5 = space();
    			td2 = element("td");
    			td2.textContent = "활성화 여부";
    			t7 = space();
    			td3 = element("td");
    			t8 = space();
    			tbody = element("tbody");
    			tr0 = element("tr");
    			td4 = element("td");
    			t9 = space();
    			td5 = element("td");
    			td5.textContent = "3dpop";
    			t11 = space();
    			td6 = element("td");
    			td6.textContent = "비활성화";
    			t13 = space();
    			td7 = element("td");
    			span0 = element("span");
    			span0.textContent = "상세 설정";
    			t15 = space();
    			tr1 = element("tr");
    			td8 = element("td");
    			t16 = space();
    			td9 = element("td");
    			td9.textContent = "a.f.z";
    			t18 = space();
    			td10 = element("td");
    			td10.textContent = "비활성화";
    			t20 = space();
    			td11 = element("td");
    			span1 = element("span");
    			span1.textContent = "상세 설정";
    			t22 = space();
    			tr2 = element("tr");
    			td12 = element("td");
    			t23 = space();
    			td13 = element("td");
    			td13.textContent = "Ad.zip(애드짚)";
    			t25 = space();
    			td14 = element("td");
    			span2 = element("span");
    			span2.textContent = "활성화";
    			t27 = space();
    			td15 = element("td");
    			span3 = element("span");
    			span3.textContent = "상세 설정";
    			t29 = space();
    			tr3 = element("tr");
    			td16 = element("td");
    			t30 = space();
    			td17 = element("td");
    			td17.textContent = "ADBC";
    			t32 = space();
    			td18 = element("td");
    			td18.textContent = "비활성화";
    			t34 = space();
    			td19 = element("td");
    			span4 = element("span");
    			span4.textContent = "상세 설정";
    			t36 = space();
    			tr4 = element("tr");
    			td20 = element("td");
    			t37 = space();
    			td21 = element("td");
    			td21.textContent = "adbox";
    			t39 = space();
    			td22 = element("td");
    			td22.textContent = "비활성화";
    			t41 = space();
    			td23 = element("td");
    			span5 = element("span");
    			span5.textContent = "상세 설정";
    			t43 = space();
    			tr5 = element("tr");
    			td24 = element("td");
    			t44 = space();
    			td25 = element("td");
    			td25.textContent = "AdBrix";
    			t46 = space();
    			td26 = element("td");
    			td26.textContent = "비활성화";
    			t48 = space();
    			td27 = element("td");
    			span6 = element("span");
    			span6.textContent = "상세 설정";
    			t50 = space();
    			tr6 = element("tr");
    			td28 = element("td");
    			t51 = space();
    			td29 = element("td");
    			td29.textContent = "adcolony";
    			t53 = space();
    			td30 = element("td");
    			td30.textContent = "비활성화";
    			t55 = space();
    			td31 = element("td");
    			span7 = element("span");
    			span7.textContent = "상세 설정";
    			t57 = space();
    			tr7 = element("tr");
    			td32 = element("td");
    			t58 = space();
    			td33 = element("td");
    			td33.textContent = "adison";
    			t60 = space();
    			td34 = element("td");
    			td34.textContent = "비활성화";
    			t62 = space();
    			td35 = element("td");
    			span8 = element("span");
    			span8.textContent = "상세 설정";
    			t64 = space();
    			button = element("button");
    			button.textContent = "파트너 등록";
    			t66 = space();
    			create_component(partnersignup.$$.fragment);
    			attr_dev(h3, "class", "head-text");
    			add_location(h3, file$g, 8, 0, 152);
    			add_location(td0, file$g, 11, 8, 230);
    			add_location(td1, file$g, 12, 8, 251);
    			add_location(td2, file$g, 13, 8, 275);
    			add_location(td3, file$g, 14, 8, 299);
    			add_location(thead, file$g, 10, 4, 214);
    			add_location(td4, file$g, 18, 12, 359);
    			add_location(td5, file$g, 19, 12, 381);
    			add_location(td6, file$g, 20, 12, 408);
    			attr_dev(span0, "class", "config");
    			add_location(span0, file$g, 21, 16, 438);
    			add_location(td7, file$g, 21, 12, 434);
    			add_location(tr0, file$g, 17, 8, 342);
    			add_location(td8, file$g, 24, 12, 516);
    			add_location(td9, file$g, 25, 12, 538);
    			add_location(td10, file$g, 26, 12, 565);
    			attr_dev(span1, "class", "config");
    			add_location(span1, file$g, 27, 16, 595);
    			add_location(td11, file$g, 27, 12, 591);
    			add_location(tr1, file$g, 23, 8, 499);
    			add_location(td12, file$g, 30, 12, 673);
    			add_location(td13, file$g, 31, 12, 695);
    			attr_dev(span2, "class", "active");
    			add_location(span2, file$g, 32, 16, 732);
    			add_location(td14, file$g, 32, 12, 728);
    			attr_dev(span3, "class", "config");
    			add_location(span3, file$g, 33, 16, 785);
    			add_location(td15, file$g, 33, 12, 781);
    			add_location(tr2, file$g, 29, 8, 656);
    			add_location(td16, file$g, 36, 12, 863);
    			add_location(td17, file$g, 37, 12, 885);
    			add_location(td18, file$g, 38, 12, 911);
    			attr_dev(span4, "class", "config");
    			add_location(span4, file$g, 39, 16, 941);
    			add_location(td19, file$g, 39, 12, 937);
    			add_location(tr3, file$g, 35, 8, 846);
    			add_location(td20, file$g, 42, 12, 1019);
    			add_location(td21, file$g, 43, 12, 1041);
    			add_location(td22, file$g, 44, 12, 1068);
    			attr_dev(span5, "class", "config");
    			add_location(span5, file$g, 45, 16, 1098);
    			add_location(td23, file$g, 45, 12, 1094);
    			add_location(tr4, file$g, 41, 8, 1002);
    			add_location(td24, file$g, 48, 12, 1176);
    			add_location(td25, file$g, 49, 12, 1198);
    			add_location(td26, file$g, 50, 12, 1226);
    			attr_dev(span6, "class", "config");
    			add_location(span6, file$g, 51, 16, 1256);
    			add_location(td27, file$g, 51, 12, 1252);
    			add_location(tr5, file$g, 47, 8, 1159);
    			add_location(td28, file$g, 54, 12, 1334);
    			add_location(td29, file$g, 55, 12, 1356);
    			add_location(td30, file$g, 56, 12, 1386);
    			attr_dev(span7, "class", "config");
    			add_location(span7, file$g, 57, 16, 1416);
    			add_location(td31, file$g, 57, 12, 1412);
    			add_location(tr6, file$g, 53, 8, 1317);
    			add_location(td32, file$g, 60, 12, 1494);
    			add_location(td33, file$g, 61, 12, 1516);
    			add_location(td34, file$g, 62, 12, 1544);
    			attr_dev(span8, "class", "config");
    			add_location(span8, file$g, 63, 16, 1574);
    			add_location(td35, file$g, 63, 12, 1570);
    			add_location(tr7, file$g, 59, 8, 1477);
    			add_location(tbody, file$g, 16, 4, 326);
    			attr_dev(table, "class", "partner");
    			add_location(table, file$g, 9, 0, 186);
    			attr_dev(button, "type", "button");
    			attr_dev(button, "class", "btn btn-primary");
    			add_location(button, file$g, 68, 0, 1650);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h3, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, table, anchor);
    			append_dev(table, thead);
    			append_dev(thead, td0);
    			append_dev(thead, t3);
    			append_dev(thead, td1);
    			append_dev(thead, t5);
    			append_dev(thead, td2);
    			append_dev(thead, t7);
    			append_dev(thead, td3);
    			append_dev(table, t8);
    			append_dev(table, tbody);
    			append_dev(tbody, tr0);
    			append_dev(tr0, td4);
    			append_dev(tr0, t9);
    			append_dev(tr0, td5);
    			append_dev(tr0, t11);
    			append_dev(tr0, td6);
    			append_dev(tr0, t13);
    			append_dev(tr0, td7);
    			append_dev(td7, span0);
    			append_dev(tbody, t15);
    			append_dev(tbody, tr1);
    			append_dev(tr1, td8);
    			append_dev(tr1, t16);
    			append_dev(tr1, td9);
    			append_dev(tr1, t18);
    			append_dev(tr1, td10);
    			append_dev(tr1, t20);
    			append_dev(tr1, td11);
    			append_dev(td11, span1);
    			append_dev(tbody, t22);
    			append_dev(tbody, tr2);
    			append_dev(tr2, td12);
    			append_dev(tr2, t23);
    			append_dev(tr2, td13);
    			append_dev(tr2, t25);
    			append_dev(tr2, td14);
    			append_dev(td14, span2);
    			append_dev(tr2, t27);
    			append_dev(tr2, td15);
    			append_dev(td15, span3);
    			append_dev(tbody, t29);
    			append_dev(tbody, tr3);
    			append_dev(tr3, td16);
    			append_dev(tr3, t30);
    			append_dev(tr3, td17);
    			append_dev(tr3, t32);
    			append_dev(tr3, td18);
    			append_dev(tr3, t34);
    			append_dev(tr3, td19);
    			append_dev(td19, span4);
    			append_dev(tbody, t36);
    			append_dev(tbody, tr4);
    			append_dev(tr4, td20);
    			append_dev(tr4, t37);
    			append_dev(tr4, td21);
    			append_dev(tr4, t39);
    			append_dev(tr4, td22);
    			append_dev(tr4, t41);
    			append_dev(tr4, td23);
    			append_dev(td23, span5);
    			append_dev(tbody, t43);
    			append_dev(tbody, tr5);
    			append_dev(tr5, td24);
    			append_dev(tr5, t44);
    			append_dev(tr5, td25);
    			append_dev(tr5, t46);
    			append_dev(tr5, td26);
    			append_dev(tr5, t48);
    			append_dev(tr5, td27);
    			append_dev(td27, span6);
    			append_dev(tbody, t50);
    			append_dev(tbody, tr6);
    			append_dev(tr6, td28);
    			append_dev(tr6, t51);
    			append_dev(tr6, td29);
    			append_dev(tr6, t53);
    			append_dev(tr6, td30);
    			append_dev(tr6, t55);
    			append_dev(tr6, td31);
    			append_dev(td31, span7);
    			append_dev(tbody, t57);
    			append_dev(tbody, tr7);
    			append_dev(tr7, td32);
    			append_dev(tr7, t58);
    			append_dev(tr7, td33);
    			append_dev(tr7, t60);
    			append_dev(tr7, td34);
    			append_dev(tr7, t62);
    			append_dev(tr7, td35);
    			append_dev(td35, span8);
    			insert_dev(target, t64, anchor);
    			insert_dev(target, button, anchor);
    			insert_dev(target, t66, anchor);
    			mount_component(partnersignup, target, anchor);
    			current = true;

    			if (!mounted) {
    				dispose = listen_dev(button, "click", signUp, false, false, false);
    				mounted = true;
    			}
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(partnersignup.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(partnersignup.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h3);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(table);
    			if (detaching) detach_dev(t64);
    			if (detaching) detach_dev(button);
    			if (detaching) detach_dev(t66);
    			destroy_component(partnersignup, detaching);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$h.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function signUp() {
    	window.$('#signup').modal('show');
    }

    function instance$h($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Partner', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Partner> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ PartnerSignUp, signUp });
    	return [];
    }

    class Partner extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$h, create_fragment$h, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Partner",
    			options,
    			id: create_fragment$h.name
    		});
    	}
    }

    /* src/fraud/FraudBlackListIPSignUp.svelte generated by Svelte v3.50.0 */

    const file$f = "src/fraud/FraudBlackListIPSignUp.svelte";

    function create_fragment$g(ctx) {
    	let div9;
    	let div8;
    	let div7;
    	let div0;
    	let h5;
    	let t1;
    	let button0;
    	let span;
    	let t3;
    	let div5;
    	let div1;
    	let t5;
    	let div2;
    	let input;
    	let t6;
    	let div3;
    	let t8;
    	let div4;
    	let textarea;
    	let t9;
    	let div6;
    	let button1;
    	let t11;
    	let button2;

    	const block = {
    		c: function create() {
    			div9 = element("div");
    			div8 = element("div");
    			div7 = element("div");
    			div0 = element("div");
    			h5 = element("h5");
    			h5.textContent = "IP 주소 등록";
    			t1 = space();
    			button0 = element("button");
    			span = element("span");
    			span.textContent = "×";
    			t3 = space();
    			div5 = element("div");
    			div1 = element("div");
    			div1.textContent = "IP 주소";
    			t5 = space();
    			div2 = element("div");
    			input = element("input");
    			t6 = space();
    			div3 = element("div");
    			div3.textContent = "설명";
    			t8 = space();
    			div4 = element("div");
    			textarea = element("textarea");
    			t9 = space();
    			div6 = element("div");
    			button1 = element("button");
    			button1.textContent = "등록";
    			t11 = space();
    			button2 = element("button");
    			button2.textContent = "닫기";
    			attr_dev(h5, "class", "modal-title");
    			add_location(h5, file$f, 7, 10, 219);
    			attr_dev(span, "aria-hidden", "true");
    			add_location(span, file$f, 9, 12, 356);
    			attr_dev(button0, "type", "button");
    			attr_dev(button0, "class", "close");
    			attr_dev(button0, "data-dismiss", "modal");
    			attr_dev(button0, "aria-label", "Close");
    			add_location(button0, file$f, 8, 10, 267);
    			attr_dev(div0, "class", "modal-header");
    			add_location(div0, file$f, 6, 8, 182);
    			attr_dev(div1, "class", "label");
    			add_location(div1, file$f, 13, 11, 475);
    			attr_dev(input, "type", "textbox");
    			add_location(input, file$f, 15, 15, 552);
    			attr_dev(div2, "class", "text");
    			add_location(div2, file$f, 14, 11, 518);
    			attr_dev(div3, "class", "label");
    			add_location(div3, file$f, 17, 12, 607);
    			add_location(textarea, file$f, 19, 15, 682);
    			attr_dev(div4, "class", "text");
    			add_location(div4, file$f, 18, 12, 648);
    			attr_dev(div5, "class", "modal-body");
    			add_location(div5, file$f, 12, 8, 439);
    			attr_dev(button1, "type", "button");
    			attr_dev(button1, "class", "btn btn-primary");
    			attr_dev(button1, "data-dismiss", "modal");
    			add_location(button1, file$f, 23, 12, 775);
    			attr_dev(button2, "type", "button");
    			attr_dev(button2, "class", "btn btn-secondary");
    			attr_dev(button2, "data-dismiss", "modal");
    			add_location(button2, file$f, 24, 12, 866);
    			attr_dev(div6, "class", "modal-footer");
    			add_location(div6, file$f, 22, 8, 736);
    			attr_dev(div7, "class", "modal-content");
    			add_location(div7, file$f, 5, 6, 146);
    			attr_dev(div8, "class", "modal-dialog");
    			attr_dev(div8, "role", "document");
    			add_location(div8, file$f, 4, 4, 97);
    			attr_dev(div9, "class", "modal fraud");
    			attr_dev(div9, "tabindex", "-1");
    			attr_dev(div9, "role", "dialog");
    			attr_dev(div9, "id", "signup-ip");
    			add_location(div9, file$f, 3, 0, 24);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div9, anchor);
    			append_dev(div9, div8);
    			append_dev(div8, div7);
    			append_dev(div7, div0);
    			append_dev(div0, h5);
    			append_dev(div0, t1);
    			append_dev(div0, button0);
    			append_dev(button0, span);
    			append_dev(div7, t3);
    			append_dev(div7, div5);
    			append_dev(div5, div1);
    			append_dev(div5, t5);
    			append_dev(div5, div2);
    			append_dev(div2, input);
    			append_dev(div5, t6);
    			append_dev(div5, div3);
    			append_dev(div5, t8);
    			append_dev(div5, div4);
    			append_dev(div4, textarea);
    			append_dev(div7, t9);
    			append_dev(div7, div6);
    			append_dev(div6, button1);
    			append_dev(div6, t11);
    			append_dev(div6, button2);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div9);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$g.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$g($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('FraudBlackListIPSignUp', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<FraudBlackListIPSignUp> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class FraudBlackListIPSignUp extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$g, create_fragment$g, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "FraudBlackListIPSignUp",
    			options,
    			id: create_fragment$g.name
    		});
    	}
    }

    /* src/fraud/FraudBlackListIP.svelte generated by Svelte v3.50.0 */
    const file$e = "src/fraud/FraudBlackListIP.svelte";

    function create_fragment$f(ctx) {
    	let table;
    	let thead;
    	let td0;
    	let t1;
    	let td1;
    	let t3;
    	let td2;
    	let t5;
    	let td3;
    	let t6;
    	let tbody;
    	let tr0;
    	let td4;
    	let t8;
    	let td5;
    	let t10;
    	let td6;
    	let t12;
    	let td7;
    	let t13;
    	let tr1;
    	let td8;
    	let t15;
    	let td9;
    	let t17;
    	let td10;
    	let t19;
    	let td11;
    	let t20;
    	let tr2;
    	let td12;
    	let t22;
    	let td13;
    	let t24;
    	let td14;
    	let t26;
    	let td15;
    	let t27;
    	let tr3;
    	let td16;
    	let t29;
    	let td17;
    	let t31;
    	let td18;
    	let t33;
    	let td19;
    	let t34;
    	let tr4;
    	let td20;
    	let t36;
    	let td21;
    	let t38;
    	let td22;
    	let t40;
    	let td23;
    	let t41;
    	let tr5;
    	let td24;
    	let t43;
    	let td25;
    	let t45;
    	let td26;
    	let t47;
    	let td27;
    	let t48;
    	let tr6;
    	let td28;
    	let t50;
    	let td29;
    	let t52;
    	let td30;
    	let t54;
    	let td31;
    	let t55;
    	let button;
    	let t57;
    	let fraudblacklistipsignup;
    	let current;
    	let mounted;
    	let dispose;
    	fraudblacklistipsignup = new FraudBlackListIPSignUp({ $$inline: true });

    	const block = {
    		c: function create() {
    			table = element("table");
    			thead = element("thead");
    			td0 = element("td");
    			td0.textContent = "IP 주소";
    			t1 = space();
    			td1 = element("td");
    			td1.textContent = "사유";
    			t3 = space();
    			td2 = element("td");
    			td2.textContent = "생성 날짜";
    			t5 = space();
    			td3 = element("td");
    			t6 = space();
    			tbody = element("tbody");
    			tr0 = element("tr");
    			td4 = element("td");
    			td4.textContent = "172.1.1.16";
    			t8 = space();
    			td5 = element("td");
    			td5.textContent = "5/3일 엔스테이션 중복 IP";
    			t10 = space();
    			td6 = element("td");
    			td6.textContent = "2022-05-03 13:12:20";
    			t12 = space();
    			td7 = element("td");
    			t13 = space();
    			tr1 = element("tr");
    			td8 = element("td");
    			td8.textContent = "172.1.1.16";
    			t15 = space();
    			td9 = element("td");
    			td9.textContent = "5/3일 엔스테이션 중복 IP";
    			t17 = space();
    			td10 = element("td");
    			td10.textContent = "2022-05-03 13:12:20";
    			t19 = space();
    			td11 = element("td");
    			t20 = space();
    			tr2 = element("tr");
    			td12 = element("td");
    			td12.textContent = "172.1.1.16";
    			t22 = space();
    			td13 = element("td");
    			td13.textContent = "5/3일 엔스테이션 중복 IP";
    			t24 = space();
    			td14 = element("td");
    			td14.textContent = "2022-05-03 13:12:20";
    			t26 = space();
    			td15 = element("td");
    			t27 = space();
    			tr3 = element("tr");
    			td16 = element("td");
    			td16.textContent = "172.1.1.16";
    			t29 = space();
    			td17 = element("td");
    			td17.textContent = "5/3일 엔스테이션 중복 IP";
    			t31 = space();
    			td18 = element("td");
    			td18.textContent = "2022-05-03 13:12:20";
    			t33 = space();
    			td19 = element("td");
    			t34 = space();
    			tr4 = element("tr");
    			td20 = element("td");
    			td20.textContent = "172.1.1.16";
    			t36 = space();
    			td21 = element("td");
    			td21.textContent = "5/3일 엔스테이션 중복 IP";
    			t38 = space();
    			td22 = element("td");
    			td22.textContent = "2022-05-03 13:12:20";
    			t40 = space();
    			td23 = element("td");
    			t41 = space();
    			tr5 = element("tr");
    			td24 = element("td");
    			td24.textContent = "172.1.1.16";
    			t43 = space();
    			td25 = element("td");
    			td25.textContent = "5/3일 엔스테이션 중복 IP";
    			t45 = space();
    			td26 = element("td");
    			td26.textContent = "2022-05-03 13:12:20";
    			t47 = space();
    			td27 = element("td");
    			t48 = space();
    			tr6 = element("tr");
    			td28 = element("td");
    			td28.textContent = "172.1.1.16";
    			t50 = space();
    			td29 = element("td");
    			td29.textContent = "5/3일 엔스테이션 중복 IP";
    			t52 = space();
    			td30 = element("td");
    			td30.textContent = "2022-05-03 13:12:20";
    			t54 = space();
    			td31 = element("td");
    			t55 = space();
    			button = element("button");
    			button.textContent = "등록";
    			t57 = space();
    			create_component(fraudblacklistipsignup.$$.fragment);
    			attr_dev(td0, "class", "ip");
    			add_location(td0, file$e, 9, 8, 217);
    			attr_dev(td1, "class", "reason");
    			add_location(td1, file$e, 10, 8, 251);
    			attr_dev(td2, "class", "datetime");
    			add_location(td2, file$e, 11, 8, 286);
    			add_location(td3, file$e, 12, 8, 326);
    			add_location(thead, file$e, 8, 4, 201);
    			add_location(td4, file$e, 16, 12, 386);
    			add_location(td5, file$e, 17, 12, 418);
    			add_location(td6, file$e, 18, 12, 456);
    			add_location(td7, file$e, 19, 12, 497);
    			add_location(tr0, file$e, 15, 8, 369);
    			add_location(td8, file$e, 22, 12, 546);
    			add_location(td9, file$e, 23, 12, 578);
    			add_location(td10, file$e, 24, 12, 616);
    			add_location(td11, file$e, 25, 12, 657);
    			add_location(tr1, file$e, 21, 8, 529);
    			add_location(td12, file$e, 28, 12, 706);
    			add_location(td13, file$e, 29, 12, 738);
    			add_location(td14, file$e, 30, 12, 776);
    			add_location(td15, file$e, 31, 12, 817);
    			add_location(tr2, file$e, 27, 8, 689);
    			add_location(td16, file$e, 34, 12, 866);
    			add_location(td17, file$e, 35, 12, 898);
    			add_location(td18, file$e, 36, 12, 936);
    			add_location(td19, file$e, 37, 12, 977);
    			add_location(tr3, file$e, 33, 8, 849);
    			add_location(td20, file$e, 40, 12, 1026);
    			add_location(td21, file$e, 41, 12, 1058);
    			add_location(td22, file$e, 42, 12, 1096);
    			add_location(td23, file$e, 43, 12, 1137);
    			add_location(tr4, file$e, 39, 8, 1009);
    			add_location(td24, file$e, 46, 12, 1186);
    			add_location(td25, file$e, 47, 12, 1218);
    			add_location(td26, file$e, 48, 12, 1256);
    			add_location(td27, file$e, 49, 12, 1297);
    			add_location(tr5, file$e, 45, 8, 1169);
    			add_location(td28, file$e, 52, 12, 1346);
    			add_location(td29, file$e, 53, 12, 1378);
    			add_location(td30, file$e, 54, 12, 1416);
    			add_location(td31, file$e, 55, 12, 1457);
    			add_location(tr6, file$e, 51, 8, 1329);
    			add_location(tbody, file$e, 14, 4, 353);
    			attr_dev(table, "class", "fraud");
    			add_location(table, file$e, 7, 0, 175);
    			attr_dev(button, "type", "button");
    			attr_dev(button, "class", "btn btn-primary");
    			attr_dev(button, "data-dismiss", "modal");
    			add_location(button, file$e, 59, 0, 1503);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, table, anchor);
    			append_dev(table, thead);
    			append_dev(thead, td0);
    			append_dev(thead, t1);
    			append_dev(thead, td1);
    			append_dev(thead, t3);
    			append_dev(thead, td2);
    			append_dev(thead, t5);
    			append_dev(thead, td3);
    			append_dev(table, t6);
    			append_dev(table, tbody);
    			append_dev(tbody, tr0);
    			append_dev(tr0, td4);
    			append_dev(tr0, t8);
    			append_dev(tr0, td5);
    			append_dev(tr0, t10);
    			append_dev(tr0, td6);
    			append_dev(tr0, t12);
    			append_dev(tr0, td7);
    			append_dev(tbody, t13);
    			append_dev(tbody, tr1);
    			append_dev(tr1, td8);
    			append_dev(tr1, t15);
    			append_dev(tr1, td9);
    			append_dev(tr1, t17);
    			append_dev(tr1, td10);
    			append_dev(tr1, t19);
    			append_dev(tr1, td11);
    			append_dev(tbody, t20);
    			append_dev(tbody, tr2);
    			append_dev(tr2, td12);
    			append_dev(tr2, t22);
    			append_dev(tr2, td13);
    			append_dev(tr2, t24);
    			append_dev(tr2, td14);
    			append_dev(tr2, t26);
    			append_dev(tr2, td15);
    			append_dev(tbody, t27);
    			append_dev(tbody, tr3);
    			append_dev(tr3, td16);
    			append_dev(tr3, t29);
    			append_dev(tr3, td17);
    			append_dev(tr3, t31);
    			append_dev(tr3, td18);
    			append_dev(tr3, t33);
    			append_dev(tr3, td19);
    			append_dev(tbody, t34);
    			append_dev(tbody, tr4);
    			append_dev(tr4, td20);
    			append_dev(tr4, t36);
    			append_dev(tr4, td21);
    			append_dev(tr4, t38);
    			append_dev(tr4, td22);
    			append_dev(tr4, t40);
    			append_dev(tr4, td23);
    			append_dev(tbody, t41);
    			append_dev(tbody, tr5);
    			append_dev(tr5, td24);
    			append_dev(tr5, t43);
    			append_dev(tr5, td25);
    			append_dev(tr5, t45);
    			append_dev(tr5, td26);
    			append_dev(tr5, t47);
    			append_dev(tr5, td27);
    			append_dev(tbody, t48);
    			append_dev(tbody, tr6);
    			append_dev(tr6, td28);
    			append_dev(tr6, t50);
    			append_dev(tr6, td29);
    			append_dev(tr6, t52);
    			append_dev(tr6, td30);
    			append_dev(tr6, t54);
    			append_dev(tr6, td31);
    			insert_dev(target, t55, anchor);
    			insert_dev(target, button, anchor);
    			insert_dev(target, t57, anchor);
    			mount_component(fraudblacklistipsignup, target, anchor);
    			current = true;

    			if (!mounted) {
    				dispose = listen_dev(button, "click", signupIP, false, false, false);
    				mounted = true;
    			}
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(fraudblacklistipsignup.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(fraudblacklistipsignup.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(table);
    			if (detaching) detach_dev(t55);
    			if (detaching) detach_dev(button);
    			if (detaching) detach_dev(t57);
    			destroy_component(fraudblacklistipsignup, detaching);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$f.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function signupIP() {
    	window.$('#signup-ip').modal('show');
    }

    function instance$f($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('FraudBlackListIP', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<FraudBlackListIP> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ FraudBlackListIPSignUp, signupIP });
    	return [];
    }

    class FraudBlackListIP extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$f, create_fragment$f, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "FraudBlackListIP",
    			options,
    			id: create_fragment$f.name
    		});
    	}
    }

    /* src/fraud/FraudBlackListPubSignUp.svelte generated by Svelte v3.50.0 */

    const file$d = "src/fraud/FraudBlackListPubSignUp.svelte";

    function create_fragment$e(ctx) {
    	let div13;
    	let div12;
    	let div11;
    	let div0;
    	let h5;
    	let t1;
    	let button0;
    	let span;
    	let t3;
    	let div9;
    	let div1;
    	let t5;
    	let div2;
    	let input0;
    	let t6;
    	let div3;
    	let t8;
    	let div4;
    	let input1;
    	let t9;
    	let div5;
    	let t11;
    	let div6;
    	let input2;
    	let t12;
    	let div7;
    	let t14;
    	let div8;
    	let textarea;
    	let t15;
    	let div10;
    	let button1;
    	let t17;
    	let button2;

    	const block = {
    		c: function create() {
    			div13 = element("div");
    			div12 = element("div");
    			div11 = element("div");
    			div0 = element("div");
    			h5 = element("h5");
    			h5.textContent = "퍼블리셔 ID 등록";
    			t1 = space();
    			button0 = element("button");
    			span = element("span");
    			span.textContent = "×";
    			t3 = space();
    			div9 = element("div");
    			div1 = element("div");
    			div1.textContent = "Publisher(Site) ID";
    			t5 = space();
    			div2 = element("div");
    			input0 = element("input");
    			t6 = space();
    			div3 = element("div");
    			div3.textContent = "Sub Publisher(Site) ID";
    			t8 = space();
    			div4 = element("div");
    			input1 = element("input");
    			t9 = space();
    			div5 = element("div");
    			div5.textContent = "광고 파트너";
    			t11 = space();
    			div6 = element("div");
    			input2 = element("input");
    			t12 = space();
    			div7 = element("div");
    			div7.textContent = "사유";
    			t14 = space();
    			div8 = element("div");
    			textarea = element("textarea");
    			t15 = space();
    			div10 = element("div");
    			button1 = element("button");
    			button1.textContent = "등록";
    			t17 = space();
    			button2 = element("button");
    			button2.textContent = "닫기";
    			attr_dev(h5, "class", "modal-title");
    			add_location(h5, file$d, 7, 10, 220);
    			attr_dev(span, "aria-hidden", "true");
    			add_location(span, file$d, 9, 12, 359);
    			attr_dev(button0, "type", "button");
    			attr_dev(button0, "class", "close");
    			attr_dev(button0, "data-dismiss", "modal");
    			attr_dev(button0, "aria-label", "Close");
    			add_location(button0, file$d, 8, 10, 270);
    			attr_dev(div0, "class", "modal-header");
    			add_location(div0, file$d, 6, 8, 183);
    			attr_dev(div1, "class", "label");
    			add_location(div1, file$d, 13, 11, 478);
    			attr_dev(input0, "type", "textbox");
    			add_location(input0, file$d, 15, 15, 568);
    			attr_dev(div2, "class", "text");
    			add_location(div2, file$d, 14, 11, 534);
    			attr_dev(div3, "class", "label");
    			add_location(div3, file$d, 17, 11, 622);
    			attr_dev(input1, "type", "textbox");
    			add_location(input1, file$d, 19, 15, 716);
    			attr_dev(div4, "class", "text");
    			add_location(div4, file$d, 18, 11, 682);
    			attr_dev(div5, "class", "label");
    			add_location(div5, file$d, 21, 12, 771);
    			attr_dev(input2, "type", "textbox");
    			add_location(input2, file$d, 23, 15, 850);
    			attr_dev(div6, "class", "text");
    			add_location(div6, file$d, 22, 12, 816);
    			attr_dev(div7, "class", "label");
    			add_location(div7, file$d, 25, 12, 905);
    			add_location(textarea, file$d, 27, 15, 980);
    			attr_dev(div8, "class", "text");
    			add_location(div8, file$d, 26, 12, 946);
    			attr_dev(div9, "class", "modal-body");
    			add_location(div9, file$d, 12, 8, 442);
    			attr_dev(button1, "type", "button");
    			attr_dev(button1, "class", "btn btn-primary");
    			attr_dev(button1, "data-dismiss", "modal");
    			add_location(button1, file$d, 31, 12, 1073);
    			attr_dev(button2, "type", "button");
    			attr_dev(button2, "class", "btn btn-secondary");
    			attr_dev(button2, "data-dismiss", "modal");
    			add_location(button2, file$d, 32, 12, 1164);
    			attr_dev(div10, "class", "modal-footer");
    			add_location(div10, file$d, 30, 8, 1034);
    			attr_dev(div11, "class", "modal-content");
    			add_location(div11, file$d, 5, 6, 147);
    			attr_dev(div12, "class", "modal-dialog");
    			attr_dev(div12, "role", "document");
    			add_location(div12, file$d, 4, 4, 98);
    			attr_dev(div13, "class", "modal fraud");
    			attr_dev(div13, "tabindex", "-1");
    			attr_dev(div13, "role", "dialog");
    			attr_dev(div13, "id", "signup-pub");
    			add_location(div13, file$d, 3, 0, 24);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div13, anchor);
    			append_dev(div13, div12);
    			append_dev(div12, div11);
    			append_dev(div11, div0);
    			append_dev(div0, h5);
    			append_dev(div0, t1);
    			append_dev(div0, button0);
    			append_dev(button0, span);
    			append_dev(div11, t3);
    			append_dev(div11, div9);
    			append_dev(div9, div1);
    			append_dev(div9, t5);
    			append_dev(div9, div2);
    			append_dev(div2, input0);
    			append_dev(div9, t6);
    			append_dev(div9, div3);
    			append_dev(div9, t8);
    			append_dev(div9, div4);
    			append_dev(div4, input1);
    			append_dev(div9, t9);
    			append_dev(div9, div5);
    			append_dev(div9, t11);
    			append_dev(div9, div6);
    			append_dev(div6, input2);
    			append_dev(div9, t12);
    			append_dev(div9, div7);
    			append_dev(div9, t14);
    			append_dev(div9, div8);
    			append_dev(div8, textarea);
    			append_dev(div11, t15);
    			append_dev(div11, div10);
    			append_dev(div10, button1);
    			append_dev(div10, t17);
    			append_dev(div10, button2);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div13);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$e.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$e($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('FraudBlackListPubSignUp', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<FraudBlackListPubSignUp> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class FraudBlackListPubSignUp extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$e, create_fragment$e, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "FraudBlackListPubSignUp",
    			options,
    			id: create_fragment$e.name
    		});
    	}
    }

    /* src/fraud/FraudBlackListPub.svelte generated by Svelte v3.50.0 */
    const file$c = "src/fraud/FraudBlackListPub.svelte";

    function create_fragment$d(ctx) {
    	let table;
    	let thead;
    	let td0;
    	let t1;
    	let td1;
    	let t3;
    	let td2;
    	let t5;
    	let td3;
    	let t7;
    	let tbody;
    	let tr0;
    	let td4;
    	let t9;
    	let td5;
    	let t11;
    	let td6;
    	let t13;
    	let td7;
    	let t14;
    	let tr1;
    	let td8;
    	let t16;
    	let td9;
    	let t18;
    	let td10;
    	let t20;
    	let td11;
    	let t21;
    	let tr2;
    	let td12;
    	let t23;
    	let td13;
    	let t25;
    	let td14;
    	let t27;
    	let td15;
    	let t28;
    	let tr3;
    	let td16;
    	let t30;
    	let td17;
    	let t32;
    	let td18;
    	let t34;
    	let td19;
    	let t35;
    	let tr4;
    	let td20;
    	let t37;
    	let td21;
    	let t39;
    	let td22;
    	let t41;
    	let td23;
    	let t42;
    	let tr5;
    	let td24;
    	let t44;
    	let td25;
    	let t46;
    	let td26;
    	let t48;
    	let td27;
    	let t49;
    	let tr6;
    	let td28;
    	let t51;
    	let td29;
    	let t53;
    	let td30;
    	let t55;
    	let td31;
    	let t56;
    	let button;
    	let t58;
    	let fraudblacklistpubsignup;
    	let current;
    	let mounted;
    	let dispose;
    	fraudblacklistpubsignup = new FraudBlackListPubSignUp({ $$inline: true });

    	const block = {
    		c: function create() {
    			table = element("table");
    			thead = element("thead");
    			td0 = element("td");
    			td0.textContent = "퍼블리셔 ID";
    			t1 = space();
    			td1 = element("td");
    			td1.textContent = "하위 퍼블리셔 ID";
    			t3 = space();
    			td2 = element("td");
    			td2.textContent = "광고 파트너";
    			t5 = space();
    			td3 = element("td");
    			td3.textContent = "사유";
    			t7 = space();
    			tbody = element("tbody");
    			tr0 = element("tr");
    			td4 = element("td");
    			td4.textContent = "pub_id";
    			t9 = space();
    			td5 = element("td");
    			td5.textContent = "subpub_id";
    			t11 = space();
    			td6 = element("td");
    			td6.textContent = "애드팝콘";
    			t13 = space();
    			td7 = element("td");
    			t14 = space();
    			tr1 = element("tr");
    			td8 = element("td");
    			td8.textContent = "pub_id";
    			t16 = space();
    			td9 = element("td");
    			td9.textContent = "subpub_id";
    			t18 = space();
    			td10 = element("td");
    			td10.textContent = "애드팝콘";
    			t20 = space();
    			td11 = element("td");
    			t21 = space();
    			tr2 = element("tr");
    			td12 = element("td");
    			td12.textContent = "pub_id";
    			t23 = space();
    			td13 = element("td");
    			td13.textContent = "subpub_id";
    			t25 = space();
    			td14 = element("td");
    			td14.textContent = "애드팝콘";
    			t27 = space();
    			td15 = element("td");
    			t28 = space();
    			tr3 = element("tr");
    			td16 = element("td");
    			td16.textContent = "pub_id";
    			t30 = space();
    			td17 = element("td");
    			td17.textContent = "subpub_id";
    			t32 = space();
    			td18 = element("td");
    			td18.textContent = "애드팝콘";
    			t34 = space();
    			td19 = element("td");
    			t35 = space();
    			tr4 = element("tr");
    			td20 = element("td");
    			td20.textContent = "pub_id";
    			t37 = space();
    			td21 = element("td");
    			td21.textContent = "subpub_id";
    			t39 = space();
    			td22 = element("td");
    			td22.textContent = "애드팝콘";
    			t41 = space();
    			td23 = element("td");
    			t42 = space();
    			tr5 = element("tr");
    			td24 = element("td");
    			td24.textContent = "pub_id";
    			t44 = space();
    			td25 = element("td");
    			td25.textContent = "subpub_id";
    			t46 = space();
    			td26 = element("td");
    			td26.textContent = "애드팝콘";
    			t48 = space();
    			td27 = element("td");
    			t49 = space();
    			tr6 = element("tr");
    			td28 = element("td");
    			td28.textContent = "pub_id";
    			t51 = space();
    			td29 = element("td");
    			td29.textContent = "subpub_id";
    			t53 = space();
    			td30 = element("td");
    			td30.textContent = "애드팝콘";
    			t55 = space();
    			td31 = element("td");
    			t56 = space();
    			button = element("button");
    			button.textContent = "등록";
    			t58 = space();
    			create_component(fraudblacklistpubsignup.$$.fragment);
    			attr_dev(td0, "class", "pubid");
    			add_location(td0, file$c, 10, 8, 248);
    			attr_dev(td1, "class", "pubid");
    			add_location(td1, file$c, 11, 8, 287);
    			attr_dev(td2, "class", "adpartner");
    			add_location(td2, file$c, 12, 8, 329);
    			add_location(td3, file$c, 13, 8, 371);
    			add_location(thead, file$c, 9, 4, 232);
    			add_location(td4, file$c, 17, 12, 433);
    			add_location(td5, file$c, 18, 12, 461);
    			add_location(td6, file$c, 19, 12, 492);
    			add_location(td7, file$c, 20, 12, 518);
    			add_location(tr0, file$c, 16, 8, 416);
    			add_location(td8, file$c, 23, 12, 567);
    			add_location(td9, file$c, 24, 12, 595);
    			add_location(td10, file$c, 25, 12, 626);
    			add_location(td11, file$c, 26, 12, 652);
    			add_location(tr1, file$c, 22, 8, 550);
    			add_location(td12, file$c, 29, 12, 701);
    			add_location(td13, file$c, 30, 12, 729);
    			add_location(td14, file$c, 31, 12, 760);
    			add_location(td15, file$c, 32, 12, 786);
    			add_location(tr2, file$c, 28, 8, 684);
    			add_location(td16, file$c, 35, 12, 835);
    			add_location(td17, file$c, 36, 12, 863);
    			add_location(td18, file$c, 37, 12, 894);
    			add_location(td19, file$c, 38, 12, 920);
    			add_location(tr3, file$c, 34, 8, 818);
    			add_location(td20, file$c, 41, 12, 969);
    			add_location(td21, file$c, 42, 12, 997);
    			add_location(td22, file$c, 43, 12, 1028);
    			add_location(td23, file$c, 44, 12, 1054);
    			add_location(tr4, file$c, 40, 8, 952);
    			add_location(td24, file$c, 47, 12, 1103);
    			add_location(td25, file$c, 48, 12, 1131);
    			add_location(td26, file$c, 49, 12, 1162);
    			add_location(td27, file$c, 50, 12, 1188);
    			add_location(tr5, file$c, 46, 8, 1086);
    			add_location(td28, file$c, 53, 12, 1237);
    			add_location(td29, file$c, 54, 12, 1265);
    			add_location(td30, file$c, 55, 12, 1296);
    			add_location(td31, file$c, 56, 12, 1322);
    			add_location(tr6, file$c, 52, 8, 1220);
    			add_location(tbody, file$c, 15, 4, 400);
    			attr_dev(table, "class", "fraud");
    			attr_dev(table, "id", "fraud-black-list-pub");
    			add_location(table, file$c, 8, 0, 180);
    			attr_dev(button, "type", "button");
    			attr_dev(button, "class", "btn btn-primary");
    			attr_dev(button, "data-dismiss", "modal");
    			add_location(button, file$c, 60, 0, 1368);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, table, anchor);
    			append_dev(table, thead);
    			append_dev(thead, td0);
    			append_dev(thead, t1);
    			append_dev(thead, td1);
    			append_dev(thead, t3);
    			append_dev(thead, td2);
    			append_dev(thead, t5);
    			append_dev(thead, td3);
    			append_dev(table, t7);
    			append_dev(table, tbody);
    			append_dev(tbody, tr0);
    			append_dev(tr0, td4);
    			append_dev(tr0, t9);
    			append_dev(tr0, td5);
    			append_dev(tr0, t11);
    			append_dev(tr0, td6);
    			append_dev(tr0, t13);
    			append_dev(tr0, td7);
    			append_dev(tbody, t14);
    			append_dev(tbody, tr1);
    			append_dev(tr1, td8);
    			append_dev(tr1, t16);
    			append_dev(tr1, td9);
    			append_dev(tr1, t18);
    			append_dev(tr1, td10);
    			append_dev(tr1, t20);
    			append_dev(tr1, td11);
    			append_dev(tbody, t21);
    			append_dev(tbody, tr2);
    			append_dev(tr2, td12);
    			append_dev(tr2, t23);
    			append_dev(tr2, td13);
    			append_dev(tr2, t25);
    			append_dev(tr2, td14);
    			append_dev(tr2, t27);
    			append_dev(tr2, td15);
    			append_dev(tbody, t28);
    			append_dev(tbody, tr3);
    			append_dev(tr3, td16);
    			append_dev(tr3, t30);
    			append_dev(tr3, td17);
    			append_dev(tr3, t32);
    			append_dev(tr3, td18);
    			append_dev(tr3, t34);
    			append_dev(tr3, td19);
    			append_dev(tbody, t35);
    			append_dev(tbody, tr4);
    			append_dev(tr4, td20);
    			append_dev(tr4, t37);
    			append_dev(tr4, td21);
    			append_dev(tr4, t39);
    			append_dev(tr4, td22);
    			append_dev(tr4, t41);
    			append_dev(tr4, td23);
    			append_dev(tbody, t42);
    			append_dev(tbody, tr5);
    			append_dev(tr5, td24);
    			append_dev(tr5, t44);
    			append_dev(tr5, td25);
    			append_dev(tr5, t46);
    			append_dev(tr5, td26);
    			append_dev(tr5, t48);
    			append_dev(tr5, td27);
    			append_dev(tbody, t49);
    			append_dev(tbody, tr6);
    			append_dev(tr6, td28);
    			append_dev(tr6, t51);
    			append_dev(tr6, td29);
    			append_dev(tr6, t53);
    			append_dev(tr6, td30);
    			append_dev(tr6, t55);
    			append_dev(tr6, td31);
    			insert_dev(target, t56, anchor);
    			insert_dev(target, button, anchor);
    			insert_dev(target, t58, anchor);
    			mount_component(fraudblacklistpubsignup, target, anchor);
    			current = true;

    			if (!mounted) {
    				dispose = listen_dev(button, "click", signupPub, false, false, false);
    				mounted = true;
    			}
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(fraudblacklistpubsignup.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(fraudblacklistpubsignup.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(table);
    			if (detaching) detach_dev(t56);
    			if (detaching) detach_dev(button);
    			if (detaching) detach_dev(t58);
    			destroy_component(fraudblacklistpubsignup, detaching);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$d.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function signupPub() {
    	window.$('#signup-pub').modal('show');
    }

    function instance$d($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('FraudBlackListPub', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<FraudBlackListPub> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ FraudBlackListPubSignUp, signupPub });
    	return [];
    }

    class FraudBlackListPub extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$d, create_fragment$d, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "FraudBlackListPub",
    			options,
    			id: create_fragment$d.name
    		});
    	}
    }

    /* src/fraud/FraudBlackList.svelte generated by Svelte v3.50.0 */
    const file$b = "src/fraud/FraudBlackList.svelte";

    function create_fragment$c(ctx) {
    	let div1;
    	let button;
    	let t1;
    	let div0;
    	let a0;
    	let t3;
    	let a1;
    	let t5;
    	let div2;
    	let fraudblacklistip;
    	let t6;
    	let div3;
    	let fraudblacklistpub;
    	let current;
    	let mounted;
    	let dispose;
    	fraudblacklistip = new FraudBlackListIP({ $$inline: true });
    	fraudblacklistpub = new FraudBlackListPub({ $$inline: true });

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			button = element("button");
    			button.textContent = "퍼블리셔 ID";
    			t1 = space();
    			div0 = element("div");
    			a0 = element("a");
    			a0.textContent = "퍼블리셔 ID";
    			t3 = space();
    			a1 = element("a");
    			a1.textContent = "IP 주소";
    			t5 = space();
    			div2 = element("div");
    			create_component(fraudblacklistip.$$.fragment);
    			t6 = space();
    			div3 = element("div");
    			create_component(fraudblacklistpub.$$.fragment);
    			attr_dev(button, "class", "btn btn-secondary dropdown-toggle");
    			attr_dev(button, "type", "button");
    			attr_dev(button, "id", "dropdown-1");
    			attr_dev(button, "data-toggle", "dropdown");
    			attr_dev(button, "aria-haspopup", "true");
    			attr_dev(button, "aria-expanded", "false");
    			add_location(button, file$b, 21, 4, 527);
    			attr_dev(a0, "class", "dropdown-item");
    			attr_dev(a0, "href", "#");
    			add_location(a0, file$b, 24, 6, 819);
    			attr_dev(a1, "class", "dropdown-item");
    			attr_dev(a1, "href", "#");
    			add_location(a1, file$b, 26, 6, 944);
    			attr_dev(div0, "class", "dropdown-menu");
    			attr_dev(div0, "aria-labelledby", "dropdownMenuButton");
    			add_location(div0, file$b, 22, 4, 694);
    			attr_dev(div1, "class", "dropdown");
    			add_location(div1, file$b, 20, 0, 500);
    			attr_dev(div2, "id", "fraud-black-list-ip");
    			attr_dev(div2, "class", "cont-2 hidden");
    			add_location(div2, file$b, 31, 0, 1028);
    			attr_dev(div3, "id", "fraud-black-list-pub");
    			attr_dev(div3, "class", "cont-2");
    			add_location(div3, file$b, 34, 0, 1110);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, button);
    			append_dev(div1, t1);
    			append_dev(div1, div0);
    			append_dev(div0, a0);
    			append_dev(div0, t3);
    			append_dev(div0, a1);
    			insert_dev(target, t5, anchor);
    			insert_dev(target, div2, anchor);
    			mount_component(fraudblacklistip, div2, null);
    			insert_dev(target, t6, anchor);
    			insert_dev(target, div3, anchor);
    			mount_component(fraudblacklistpub, div3, null);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(a0, "click", showfbPub, false, false, false),
    					listen_dev(a1, "click", showfbIP, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(fraudblacklistip.$$.fragment, local);
    			transition_in(fraudblacklistpub.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(fraudblacklistip.$$.fragment, local);
    			transition_out(fraudblacklistpub.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    			if (detaching) detach_dev(t5);
    			if (detaching) detach_dev(div2);
    			destroy_component(fraudblacklistip);
    			if (detaching) detach_dev(t6);
    			if (detaching) detach_dev(div3);
    			destroy_component(fraudblacklistpub);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$c.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function showfbIP() {
    	window.$('#fraud-black-list-ip').show();
    	window.$('#fraud-black-list-pub').hide();
    	window.$('#dropdown-1').text('IP 주소');
    }

    function showfbPub() {
    	window.$('#fraud-black-list-ip').hide();
    	window.$('#fraud-black-list-pub').show();
    	window.$('#dropdown-1').text('퍼블리셔 ID');
    }

    function instance$c($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('FraudBlackList', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<FraudBlackList> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({
    		FraudBlackListIP,
    		FraudBlackListPub,
    		showfbIP,
    		showfbPub
    	});

    	return [];
    }

    class FraudBlackList extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$c, create_fragment$c, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "FraudBlackList",
    			options,
    			id: create_fragment$c.name
    		});
    	}
    }

    /* src/Fraud.svelte generated by Svelte v3.50.0 */
    const file$a = "src/Fraud.svelte";

    function create_fragment$b(ctx) {
    	let h3;
    	let t1;
    	let ul;
    	let li;
    	let a;
    	let t3;
    	let div;
    	let fraudblacklist;
    	let current;
    	fraudblacklist = new FraudBlackList({ $$inline: true });

    	const block = {
    		c: function create() {
    			h3 = element("h3");
    			h3.textContent = "프로드 방지";
    			t1 = space();
    			ul = element("ul");
    			li = element("li");
    			a = element("a");
    			a.textContent = "블랙 리스트";
    			t3 = space();
    			div = element("div");
    			create_component(fraudblacklist.$$.fragment);
    			attr_dev(h3, "class", "head-text");
    			add_location(h3, file$a, 3, 0, 84);
    			attr_dev(a, "class", "nav-link active");
    			attr_dev(a, "href", "#");
    			add_location(a, file$a, 7, 8, 223);
    			attr_dev(li, "class", "nav-item");
    			add_location(li, file$a, 5, 4, 139);
    			attr_dev(ul, "class", "nav");
    			add_location(ul, file$a, 4, 0, 118);
    			attr_dev(div, "class", "cont");
    			add_location(div, file$a, 12, 0, 288);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h3, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, ul, anchor);
    			append_dev(ul, li);
    			append_dev(li, a);
    			insert_dev(target, t3, anchor);
    			insert_dev(target, div, anchor);
    			mount_component(fraudblacklist, div, null);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(fraudblacklist.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(fraudblacklist.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h3);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(ul);
    			if (detaching) detach_dev(t3);
    			if (detaching) detach_dev(div);
    			destroy_component(fraudblacklist);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$b.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$b($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Fraud', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Fraud> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ FraudBlackList });
    	return [];
    }

    class Fraud extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$b, create_fragment$b, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Fraud",
    			options,
    			id: create_fragment$b.name
    		});
    	}
    }

    /* src/Tracking.svelte generated by Svelte v3.50.0 */

    const file$9 = "src/Tracking.svelte";

    function create_fragment$a(ctx) {
    	let h3;

    	const block = {
    		c: function create() {
    			h3 = element("h3");
    			h3.textContent = "트래킹 링크";
    			attr_dev(h3, "class", "head-text");
    			add_location(h3, file$9, 3, 0, 24);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h3, anchor);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h3);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$a.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$a($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Tracking', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Tracking> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class Tracking extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$a, create_fragment$a, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Tracking",
    			options,
    			id: create_fragment$a.name
    		});
    	}
    }

    /* src/Attr.svelte generated by Svelte v3.50.0 */

    const file$8 = "src/Attr.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[1] = list[i];
    	return child_ctx;
    }

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[1] = list[i];
    	return child_ctx;
    }

    function get_each_context_2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[1] = list[i];
    	return child_ctx;
    }

    function get_each_context_3(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[1] = list[i];
    	return child_ctx;
    }

    function get_each_context_4(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[1] = list[i];
    	return child_ctx;
    }

    function get_each_context_5(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[1] = list[i];
    	return child_ctx;
    }

    function get_each_context_6(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[1] = list[i];
    	return child_ctx;
    }

    function get_each_context_7(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[1] = list[i];
    	return child_ctx;
    }

    function get_each_context_8(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[1] = list[i];
    	return child_ctx;
    }

    function get_each_context_9(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[1] = list[i];
    	return child_ctx;
    }

    function get_each_context_10(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[1] = list[i];
    	return child_ctx;
    }

    function get_each_context_11(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[1] = list[i];
    	return child_ctx;
    }

    function get_each_context_12(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[1] = list[i];
    	return child_ctx;
    }

    function get_each_context_13(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[1] = list[i];
    	return child_ctx;
    }

    function get_each_context_14(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[1] = list[i];
    	return child_ctx;
    }

    function get_each_context_15(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[1] = list[i];
    	return child_ctx;
    }

    function get_each_context_16(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[1] = list[i];
    	return child_ctx;
    }

    function get_each_context_17(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[1] = list[i];
    	return child_ctx;
    }

    // (32:12) {#each rows as row}
    function create_each_block_17(ctx) {
    	let option;
    	let t_value = /*row*/ ctx[1] + "";
    	let t;

    	const block = {
    		c: function create() {
    			option = element("option");
    			t = text(t_value);
    			option.__value = /*row*/ ctx[1];
    			option.value = option.__value;
    			add_location(option, file$8, 32, 16, 1164);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, option, anchor);
    			append_dev(option, t);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(option);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_17.name,
    		type: "each",
    		source: "(32:12) {#each rows as row}",
    		ctx
    	});

    	return block;
    }

    // (47:12) {#each rows as row}
    function create_each_block_16(ctx) {
    	let option;
    	let t_value = /*row*/ ctx[1] + "";
    	let t;

    	const block = {
    		c: function create() {
    			option = element("option");
    			t = text(t_value);
    			option.__value = /*row*/ ctx[1];
    			option.value = option.__value;
    			add_location(option, file$8, 47, 16, 1712);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, option, anchor);
    			append_dev(option, t);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(option);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_16.name,
    		type: "each",
    		source: "(47:12) {#each rows as row}",
    		ctx
    	});

    	return block;
    }

    // (62:12) {#each rows as row}
    function create_each_block_15(ctx) {
    	let option;
    	let t_value = /*row*/ ctx[1] + "";
    	let t;

    	const block = {
    		c: function create() {
    			option = element("option");
    			t = text(t_value);
    			option.__value = /*row*/ ctx[1];
    			option.value = option.__value;
    			add_location(option, file$8, 62, 16, 2260);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, option, anchor);
    			append_dev(option, t);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(option);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_15.name,
    		type: "each",
    		source: "(62:12) {#each rows as row}",
    		ctx
    	});

    	return block;
    }

    // (77:12) {#each rows as row}
    function create_each_block_14(ctx) {
    	let option;
    	let t_value = /*row*/ ctx[1] + "";
    	let t;

    	const block = {
    		c: function create() {
    			option = element("option");
    			t = text(t_value);
    			option.__value = /*row*/ ctx[1];
    			option.value = option.__value;
    			add_location(option, file$8, 77, 16, 2808);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, option, anchor);
    			append_dev(option, t);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(option);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_14.name,
    		type: "each",
    		source: "(77:12) {#each rows as row}",
    		ctx
    	});

    	return block;
    }

    // (92:12) {#each rows as row}
    function create_each_block_13(ctx) {
    	let option;
    	let t_value = /*row*/ ctx[1] + "";
    	let t;

    	const block = {
    		c: function create() {
    			option = element("option");
    			t = text(t_value);
    			option.__value = /*row*/ ctx[1];
    			option.value = option.__value;
    			add_location(option, file$8, 92, 16, 3356);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, option, anchor);
    			append_dev(option, t);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(option);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_13.name,
    		type: "each",
    		source: "(92:12) {#each rows as row}",
    		ctx
    	});

    	return block;
    }

    // (107:12) {#each rows as row}
    function create_each_block_12(ctx) {
    	let option;
    	let t_value = /*row*/ ctx[1] + "";
    	let t;

    	const block = {
    		c: function create() {
    			option = element("option");
    			t = text(t_value);
    			option.__value = /*row*/ ctx[1];
    			option.value = option.__value;
    			add_location(option, file$8, 107, 16, 3904);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, option, anchor);
    			append_dev(option, t);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(option);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_12.name,
    		type: "each",
    		source: "(107:12) {#each rows as row}",
    		ctx
    	});

    	return block;
    }

    // (133:12) {#each rows as row}
    function create_each_block_11(ctx) {
    	let option;
    	let t_value = /*row*/ ctx[1] + "";
    	let t;

    	const block = {
    		c: function create() {
    			option = element("option");
    			t = text(t_value);
    			option.__value = /*row*/ ctx[1];
    			option.value = option.__value;
    			add_location(option, file$8, 133, 16, 4584);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, option, anchor);
    			append_dev(option, t);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(option);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_11.name,
    		type: "each",
    		source: "(133:12) {#each rows as row}",
    		ctx
    	});

    	return block;
    }

    // (148:12) {#each rows as row}
    function create_each_block_10(ctx) {
    	let option;
    	let t_value = /*row*/ ctx[1] + "";
    	let t;

    	const block = {
    		c: function create() {
    			option = element("option");
    			t = text(t_value);
    			option.__value = /*row*/ ctx[1];
    			option.value = option.__value;
    			add_location(option, file$8, 148, 16, 5132);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, option, anchor);
    			append_dev(option, t);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(option);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_10.name,
    		type: "each",
    		source: "(148:12) {#each rows as row}",
    		ctx
    	});

    	return block;
    }

    // (163:12) {#each rows as row}
    function create_each_block_9(ctx) {
    	let option;
    	let t_value = /*row*/ ctx[1] + "";
    	let t;

    	const block = {
    		c: function create() {
    			option = element("option");
    			t = text(t_value);
    			option.__value = /*row*/ ctx[1];
    			option.value = option.__value;
    			add_location(option, file$8, 163, 16, 5680);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, option, anchor);
    			append_dev(option, t);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(option);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_9.name,
    		type: "each",
    		source: "(163:12) {#each rows as row}",
    		ctx
    	});

    	return block;
    }

    // (178:12) {#each rows as row}
    function create_each_block_8(ctx) {
    	let option;
    	let t_value = /*row*/ ctx[1] + "";
    	let t;

    	const block = {
    		c: function create() {
    			option = element("option");
    			t = text(t_value);
    			option.__value = /*row*/ ctx[1];
    			option.value = option.__value;
    			add_location(option, file$8, 178, 16, 6228);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, option, anchor);
    			append_dev(option, t);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(option);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_8.name,
    		type: "each",
    		source: "(178:12) {#each rows as row}",
    		ctx
    	});

    	return block;
    }

    // (193:12) {#each rows as row}
    function create_each_block_7(ctx) {
    	let option;
    	let t_value = /*row*/ ctx[1] + "";
    	let t;

    	const block = {
    		c: function create() {
    			option = element("option");
    			t = text(t_value);
    			option.__value = /*row*/ ctx[1];
    			option.value = option.__value;
    			add_location(option, file$8, 193, 16, 6776);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, option, anchor);
    			append_dev(option, t);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(option);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_7.name,
    		type: "each",
    		source: "(193:12) {#each rows as row}",
    		ctx
    	});

    	return block;
    }

    // (208:12) {#each rows as row}
    function create_each_block_6(ctx) {
    	let option;
    	let t_value = /*row*/ ctx[1] + "";
    	let t;

    	const block = {
    		c: function create() {
    			option = element("option");
    			t = text(t_value);
    			option.__value = /*row*/ ctx[1];
    			option.value = option.__value;
    			add_location(option, file$8, 208, 16, 7324);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, option, anchor);
    			append_dev(option, t);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(option);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_6.name,
    		type: "each",
    		source: "(208:12) {#each rows as row}",
    		ctx
    	});

    	return block;
    }

    // (235:12) {#each rows as row}
    function create_each_block_5(ctx) {
    	let option;
    	let t_value = /*row*/ ctx[1] + "";
    	let t;

    	const block = {
    		c: function create() {
    			option = element("option");
    			t = text(t_value);
    			option.__value = /*row*/ ctx[1];
    			option.value = option.__value;
    			add_location(option, file$8, 235, 16, 8005);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, option, anchor);
    			append_dev(option, t);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(option);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_5.name,
    		type: "each",
    		source: "(235:12) {#each rows as row}",
    		ctx
    	});

    	return block;
    }

    // (250:12) {#each rows as row}
    function create_each_block_4(ctx) {
    	let option;
    	let t_value = /*row*/ ctx[1] + "";
    	let t;

    	const block = {
    		c: function create() {
    			option = element("option");
    			t = text(t_value);
    			option.__value = /*row*/ ctx[1];
    			option.value = option.__value;
    			add_location(option, file$8, 250, 16, 8553);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, option, anchor);
    			append_dev(option, t);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(option);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_4.name,
    		type: "each",
    		source: "(250:12) {#each rows as row}",
    		ctx
    	});

    	return block;
    }

    // (265:12) {#each rows as row}
    function create_each_block_3(ctx) {
    	let option;
    	let t_value = /*row*/ ctx[1] + "";
    	let t;

    	const block = {
    		c: function create() {
    			option = element("option");
    			t = text(t_value);
    			option.__value = /*row*/ ctx[1];
    			option.value = option.__value;
    			add_location(option, file$8, 265, 16, 9101);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, option, anchor);
    			append_dev(option, t);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(option);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_3.name,
    		type: "each",
    		source: "(265:12) {#each rows as row}",
    		ctx
    	});

    	return block;
    }

    // (280:12) {#each rows as row}
    function create_each_block_2(ctx) {
    	let option;
    	let t_value = /*row*/ ctx[1] + "";
    	let t;

    	const block = {
    		c: function create() {
    			option = element("option");
    			t = text(t_value);
    			option.__value = /*row*/ ctx[1];
    			option.value = option.__value;
    			add_location(option, file$8, 280, 16, 9649);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, option, anchor);
    			append_dev(option, t);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(option);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_2.name,
    		type: "each",
    		source: "(280:12) {#each rows as row}",
    		ctx
    	});

    	return block;
    }

    // (295:12) {#each rows as row}
    function create_each_block_1(ctx) {
    	let option;
    	let t_value = /*row*/ ctx[1] + "";
    	let t;

    	const block = {
    		c: function create() {
    			option = element("option");
    			t = text(t_value);
    			option.__value = /*row*/ ctx[1];
    			option.value = option.__value;
    			add_location(option, file$8, 295, 16, 10197);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, option, anchor);
    			append_dev(option, t);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(option);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_1.name,
    		type: "each",
    		source: "(295:12) {#each rows as row}",
    		ctx
    	});

    	return block;
    }

    // (310:12) {#each rows as row}
    function create_each_block(ctx) {
    	let option;
    	let t_value = /*row*/ ctx[1] + "";
    	let t;

    	const block = {
    		c: function create() {
    			option = element("option");
    			t = text(t_value);
    			option.__value = /*row*/ ctx[1];
    			option.value = option.__value;
    			add_location(option, file$8, 310, 16, 10745);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, option, anchor);
    			append_dev(option, t);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(option);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(310:12) {#each rows as row}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$9(ctx) {
    	let h3;
    	let t1;
    	let div7;
    	let div0;
    	let h50;
    	let t3;
    	let div1;
    	let select0;
    	let t4;
    	let input0;
    	let t5;
    	let select1;
    	let option0;
    	let option1;
    	let option2;
    	let t9;
    	let span0;
    	let t11;
    	let i0;
    	let t12;
    	let div2;
    	let select2;
    	let t13;
    	let input1;
    	let t14;
    	let select3;
    	let option3;
    	let option4;
    	let option5;
    	let t18;
    	let span1;
    	let t20;
    	let i1;
    	let t21;
    	let div3;
    	let select4;
    	let t22;
    	let input2;
    	let t23;
    	let select5;
    	let option6;
    	let option7;
    	let option8;
    	let t27;
    	let span2;
    	let t29;
    	let i2;
    	let t30;
    	let div4;
    	let select6;
    	let t31;
    	let input3;
    	let t32;
    	let select7;
    	let option9;
    	let option10;
    	let option11;
    	let t36;
    	let span3;
    	let t38;
    	let i3;
    	let t39;
    	let div5;
    	let select8;
    	let t40;
    	let input4;
    	let t41;
    	let select9;
    	let option12;
    	let option13;
    	let option14;
    	let t45;
    	let span4;
    	let t47;
    	let i4;
    	let t48;
    	let div6;
    	let select10;
    	let t49;
    	let input5;
    	let t50;
    	let select11;
    	let option15;
    	let option16;
    	let option17;
    	let t54;
    	let span5;
    	let t56;
    	let i5;
    	let t57;
    	let i6;
    	let t58;
    	let div15;
    	let div8;
    	let h51;
    	let t60;
    	let div9;
    	let select12;
    	let t61;
    	let input6;
    	let t62;
    	let select13;
    	let option18;
    	let option19;
    	let option20;
    	let t66;
    	let span6;
    	let t68;
    	let i7;
    	let t69;
    	let div10;
    	let select14;
    	let t70;
    	let input7;
    	let t71;
    	let select15;
    	let option21;
    	let option22;
    	let option23;
    	let t75;
    	let span7;
    	let t77;
    	let i8;
    	let t78;
    	let div11;
    	let select16;
    	let t79;
    	let input8;
    	let t80;
    	let select17;
    	let option24;
    	let option25;
    	let option26;
    	let t84;
    	let span8;
    	let t86;
    	let i9;
    	let t87;
    	let div12;
    	let select18;
    	let t88;
    	let input9;
    	let t89;
    	let select19;
    	let option27;
    	let option28;
    	let option29;
    	let t93;
    	let span9;
    	let t95;
    	let i10;
    	let t96;
    	let div13;
    	let select20;
    	let t97;
    	let input10;
    	let t98;
    	let select21;
    	let option30;
    	let option31;
    	let option32;
    	let t102;
    	let span10;
    	let t104;
    	let i11;
    	let t105;
    	let div14;
    	let select22;
    	let t106;
    	let input11;
    	let t107;
    	let select23;
    	let option33;
    	let option34;
    	let option35;
    	let t111;
    	let span11;
    	let t113;
    	let i12;
    	let t114;
    	let i13;
    	let t115;
    	let div23;
    	let div16;
    	let h52;
    	let t117;
    	let div17;
    	let select24;
    	let t118;
    	let input12;
    	let t119;
    	let select25;
    	let option36;
    	let option37;
    	let option38;
    	let t123;
    	let span12;
    	let t125;
    	let i14;
    	let t126;
    	let div18;
    	let select26;
    	let t127;
    	let input13;
    	let t128;
    	let select27;
    	let option39;
    	let option40;
    	let option41;
    	let t132;
    	let span13;
    	let t134;
    	let i15;
    	let t135;
    	let div19;
    	let select28;
    	let t136;
    	let input14;
    	let t137;
    	let select29;
    	let option42;
    	let option43;
    	let option44;
    	let t141;
    	let span14;
    	let t143;
    	let i16;
    	let t144;
    	let div20;
    	let select30;
    	let t145;
    	let input15;
    	let t146;
    	let select31;
    	let option45;
    	let option46;
    	let option47;
    	let t150;
    	let span15;
    	let t152;
    	let i17;
    	let t153;
    	let div21;
    	let select32;
    	let t154;
    	let input16;
    	let t155;
    	let select33;
    	let option48;
    	let option49;
    	let option50;
    	let t159;
    	let span16;
    	let t161;
    	let i18;
    	let t162;
    	let div22;
    	let select34;
    	let t163;
    	let input17;
    	let t164;
    	let select35;
    	let option51;
    	let option52;
    	let option53;
    	let t168;
    	let span17;
    	let t170;
    	let i19;
    	let t171;
    	let i20;
    	let t172;
    	let button;
    	let each_value_17 = /*rows*/ ctx[0];
    	validate_each_argument(each_value_17);
    	let each_blocks_17 = [];

    	for (let i = 0; i < each_value_17.length; i += 1) {
    		each_blocks_17[i] = create_each_block_17(get_each_context_17(ctx, each_value_17, i));
    	}

    	let each_value_16 = /*rows*/ ctx[0];
    	validate_each_argument(each_value_16);
    	let each_blocks_16 = [];

    	for (let i = 0; i < each_value_16.length; i += 1) {
    		each_blocks_16[i] = create_each_block_16(get_each_context_16(ctx, each_value_16, i));
    	}

    	let each_value_15 = /*rows*/ ctx[0];
    	validate_each_argument(each_value_15);
    	let each_blocks_15 = [];

    	for (let i = 0; i < each_value_15.length; i += 1) {
    		each_blocks_15[i] = create_each_block_15(get_each_context_15(ctx, each_value_15, i));
    	}

    	let each_value_14 = /*rows*/ ctx[0];
    	validate_each_argument(each_value_14);
    	let each_blocks_14 = [];

    	for (let i = 0; i < each_value_14.length; i += 1) {
    		each_blocks_14[i] = create_each_block_14(get_each_context_14(ctx, each_value_14, i));
    	}

    	let each_value_13 = /*rows*/ ctx[0];
    	validate_each_argument(each_value_13);
    	let each_blocks_13 = [];

    	for (let i = 0; i < each_value_13.length; i += 1) {
    		each_blocks_13[i] = create_each_block_13(get_each_context_13(ctx, each_value_13, i));
    	}

    	let each_value_12 = /*rows*/ ctx[0];
    	validate_each_argument(each_value_12);
    	let each_blocks_12 = [];

    	for (let i = 0; i < each_value_12.length; i += 1) {
    		each_blocks_12[i] = create_each_block_12(get_each_context_12(ctx, each_value_12, i));
    	}

    	let each_value_11 = /*rows*/ ctx[0];
    	validate_each_argument(each_value_11);
    	let each_blocks_11 = [];

    	for (let i = 0; i < each_value_11.length; i += 1) {
    		each_blocks_11[i] = create_each_block_11(get_each_context_11(ctx, each_value_11, i));
    	}

    	let each_value_10 = /*rows*/ ctx[0];
    	validate_each_argument(each_value_10);
    	let each_blocks_10 = [];

    	for (let i = 0; i < each_value_10.length; i += 1) {
    		each_blocks_10[i] = create_each_block_10(get_each_context_10(ctx, each_value_10, i));
    	}

    	let each_value_9 = /*rows*/ ctx[0];
    	validate_each_argument(each_value_9);
    	let each_blocks_9 = [];

    	for (let i = 0; i < each_value_9.length; i += 1) {
    		each_blocks_9[i] = create_each_block_9(get_each_context_9(ctx, each_value_9, i));
    	}

    	let each_value_8 = /*rows*/ ctx[0];
    	validate_each_argument(each_value_8);
    	let each_blocks_8 = [];

    	for (let i = 0; i < each_value_8.length; i += 1) {
    		each_blocks_8[i] = create_each_block_8(get_each_context_8(ctx, each_value_8, i));
    	}

    	let each_value_7 = /*rows*/ ctx[0];
    	validate_each_argument(each_value_7);
    	let each_blocks_7 = [];

    	for (let i = 0; i < each_value_7.length; i += 1) {
    		each_blocks_7[i] = create_each_block_7(get_each_context_7(ctx, each_value_7, i));
    	}

    	let each_value_6 = /*rows*/ ctx[0];
    	validate_each_argument(each_value_6);
    	let each_blocks_6 = [];

    	for (let i = 0; i < each_value_6.length; i += 1) {
    		each_blocks_6[i] = create_each_block_6(get_each_context_6(ctx, each_value_6, i));
    	}

    	let each_value_5 = /*rows*/ ctx[0];
    	validate_each_argument(each_value_5);
    	let each_blocks_5 = [];

    	for (let i = 0; i < each_value_5.length; i += 1) {
    		each_blocks_5[i] = create_each_block_5(get_each_context_5(ctx, each_value_5, i));
    	}

    	let each_value_4 = /*rows*/ ctx[0];
    	validate_each_argument(each_value_4);
    	let each_blocks_4 = [];

    	for (let i = 0; i < each_value_4.length; i += 1) {
    		each_blocks_4[i] = create_each_block_4(get_each_context_4(ctx, each_value_4, i));
    	}

    	let each_value_3 = /*rows*/ ctx[0];
    	validate_each_argument(each_value_3);
    	let each_blocks_3 = [];

    	for (let i = 0; i < each_value_3.length; i += 1) {
    		each_blocks_3[i] = create_each_block_3(get_each_context_3(ctx, each_value_3, i));
    	}

    	let each_value_2 = /*rows*/ ctx[0];
    	validate_each_argument(each_value_2);
    	let each_blocks_2 = [];

    	for (let i = 0; i < each_value_2.length; i += 1) {
    		each_blocks_2[i] = create_each_block_2(get_each_context_2(ctx, each_value_2, i));
    	}

    	let each_value_1 = /*rows*/ ctx[0];
    	validate_each_argument(each_value_1);
    	let each_blocks_1 = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks_1[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
    	}

    	let each_value = /*rows*/ ctx[0];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			h3 = element("h3");
    			h3.textContent = "측정 모델";
    			t1 = space();
    			div7 = element("div");
    			div0 = element("div");
    			h50 = element("h5");
    			h50.textContent = "Loopback Window Tier 1";
    			t3 = space();
    			div1 = element("div");
    			select0 = element("select");

    			for (let i = 0; i < each_blocks_17.length; i += 1) {
    				each_blocks_17[i].c();
    			}

    			t4 = space();
    			input0 = element("input");
    			t5 = space();
    			select1 = element("select");
    			option0 = element("option");
    			option0.textContent = "분";
    			option1 = element("option");
    			option1.textContent = "시간";
    			option2 = element("option");
    			option2.textContent = "일";
    			t9 = space();
    			span0 = element("span");
    			span0.textContent = "안에 발생";
    			t11 = space();
    			i0 = element("i");
    			t12 = space();
    			div2 = element("div");
    			select2 = element("select");

    			for (let i = 0; i < each_blocks_16.length; i += 1) {
    				each_blocks_16[i].c();
    			}

    			t13 = space();
    			input1 = element("input");
    			t14 = space();
    			select3 = element("select");
    			option3 = element("option");
    			option3.textContent = "분";
    			option4 = element("option");
    			option4.textContent = "시간";
    			option5 = element("option");
    			option5.textContent = "일";
    			t18 = space();
    			span1 = element("span");
    			span1.textContent = "안에 발생";
    			t20 = space();
    			i1 = element("i");
    			t21 = space();
    			div3 = element("div");
    			select4 = element("select");

    			for (let i = 0; i < each_blocks_15.length; i += 1) {
    				each_blocks_15[i].c();
    			}

    			t22 = space();
    			input2 = element("input");
    			t23 = space();
    			select5 = element("select");
    			option6 = element("option");
    			option6.textContent = "분";
    			option7 = element("option");
    			option7.textContent = "시간";
    			option8 = element("option");
    			option8.textContent = "일";
    			t27 = space();
    			span2 = element("span");
    			span2.textContent = "안에 발생";
    			t29 = space();
    			i2 = element("i");
    			t30 = space();
    			div4 = element("div");
    			select6 = element("select");

    			for (let i = 0; i < each_blocks_14.length; i += 1) {
    				each_blocks_14[i].c();
    			}

    			t31 = space();
    			input3 = element("input");
    			t32 = space();
    			select7 = element("select");
    			option9 = element("option");
    			option9.textContent = "분";
    			option10 = element("option");
    			option10.textContent = "시간";
    			option11 = element("option");
    			option11.textContent = "일";
    			t36 = space();
    			span3 = element("span");
    			span3.textContent = "안에 발생";
    			t38 = space();
    			i3 = element("i");
    			t39 = space();
    			div5 = element("div");
    			select8 = element("select");

    			for (let i = 0; i < each_blocks_13.length; i += 1) {
    				each_blocks_13[i].c();
    			}

    			t40 = space();
    			input4 = element("input");
    			t41 = space();
    			select9 = element("select");
    			option12 = element("option");
    			option12.textContent = "분";
    			option13 = element("option");
    			option13.textContent = "시간";
    			option14 = element("option");
    			option14.textContent = "일";
    			t45 = space();
    			span4 = element("span");
    			span4.textContent = "안에 발생";
    			t47 = space();
    			i4 = element("i");
    			t48 = space();
    			div6 = element("div");
    			select10 = element("select");

    			for (let i = 0; i < each_blocks_12.length; i += 1) {
    				each_blocks_12[i].c();
    			}

    			t49 = space();
    			input5 = element("input");
    			t50 = space();
    			select11 = element("select");
    			option15 = element("option");
    			option15.textContent = "분";
    			option16 = element("option");
    			option16.textContent = "시간";
    			option17 = element("option");
    			option17.textContent = "일";
    			t54 = space();
    			span5 = element("span");
    			span5.textContent = "안에 발생";
    			t56 = space();
    			i5 = element("i");
    			t57 = space();
    			i6 = element("i");
    			t58 = space();
    			div15 = element("div");
    			div8 = element("div");
    			h51 = element("h5");
    			h51.textContent = "Loopback Window Tier 2";
    			t60 = space();
    			div9 = element("div");
    			select12 = element("select");

    			for (let i = 0; i < each_blocks_11.length; i += 1) {
    				each_blocks_11[i].c();
    			}

    			t61 = space();
    			input6 = element("input");
    			t62 = space();
    			select13 = element("select");
    			option18 = element("option");
    			option18.textContent = "분";
    			option19 = element("option");
    			option19.textContent = "시간";
    			option20 = element("option");
    			option20.textContent = "일";
    			t66 = space();
    			span6 = element("span");
    			span6.textContent = "안에 발생";
    			t68 = space();
    			i7 = element("i");
    			t69 = space();
    			div10 = element("div");
    			select14 = element("select");

    			for (let i = 0; i < each_blocks_10.length; i += 1) {
    				each_blocks_10[i].c();
    			}

    			t70 = space();
    			input7 = element("input");
    			t71 = space();
    			select15 = element("select");
    			option21 = element("option");
    			option21.textContent = "분";
    			option22 = element("option");
    			option22.textContent = "시간";
    			option23 = element("option");
    			option23.textContent = "일";
    			t75 = space();
    			span7 = element("span");
    			span7.textContent = "안에 발생";
    			t77 = space();
    			i8 = element("i");
    			t78 = space();
    			div11 = element("div");
    			select16 = element("select");

    			for (let i = 0; i < each_blocks_9.length; i += 1) {
    				each_blocks_9[i].c();
    			}

    			t79 = space();
    			input8 = element("input");
    			t80 = space();
    			select17 = element("select");
    			option24 = element("option");
    			option24.textContent = "분";
    			option25 = element("option");
    			option25.textContent = "시간";
    			option26 = element("option");
    			option26.textContent = "일";
    			t84 = space();
    			span8 = element("span");
    			span8.textContent = "안에 발생";
    			t86 = space();
    			i9 = element("i");
    			t87 = space();
    			div12 = element("div");
    			select18 = element("select");

    			for (let i = 0; i < each_blocks_8.length; i += 1) {
    				each_blocks_8[i].c();
    			}

    			t88 = space();
    			input9 = element("input");
    			t89 = space();
    			select19 = element("select");
    			option27 = element("option");
    			option27.textContent = "분";
    			option28 = element("option");
    			option28.textContent = "시간";
    			option29 = element("option");
    			option29.textContent = "일";
    			t93 = space();
    			span9 = element("span");
    			span9.textContent = "안에 발생";
    			t95 = space();
    			i10 = element("i");
    			t96 = space();
    			div13 = element("div");
    			select20 = element("select");

    			for (let i = 0; i < each_blocks_7.length; i += 1) {
    				each_blocks_7[i].c();
    			}

    			t97 = space();
    			input10 = element("input");
    			t98 = space();
    			select21 = element("select");
    			option30 = element("option");
    			option30.textContent = "분";
    			option31 = element("option");
    			option31.textContent = "시간";
    			option32 = element("option");
    			option32.textContent = "일";
    			t102 = space();
    			span10 = element("span");
    			span10.textContent = "안에 발생";
    			t104 = space();
    			i11 = element("i");
    			t105 = space();
    			div14 = element("div");
    			select22 = element("select");

    			for (let i = 0; i < each_blocks_6.length; i += 1) {
    				each_blocks_6[i].c();
    			}

    			t106 = space();
    			input11 = element("input");
    			t107 = space();
    			select23 = element("select");
    			option33 = element("option");
    			option33.textContent = "분";
    			option34 = element("option");
    			option34.textContent = "시간";
    			option35 = element("option");
    			option35.textContent = "일";
    			t111 = space();
    			span11 = element("span");
    			span11.textContent = "안에 발생";
    			t113 = space();
    			i12 = element("i");
    			t114 = space();
    			i13 = element("i");
    			t115 = space();
    			div23 = element("div");
    			div16 = element("div");
    			h52 = element("h5");
    			h52.textContent = "Loopback Window Tier 3";
    			t117 = space();
    			div17 = element("div");
    			select24 = element("select");

    			for (let i = 0; i < each_blocks_5.length; i += 1) {
    				each_blocks_5[i].c();
    			}

    			t118 = space();
    			input12 = element("input");
    			t119 = space();
    			select25 = element("select");
    			option36 = element("option");
    			option36.textContent = "분";
    			option37 = element("option");
    			option37.textContent = "시간";
    			option38 = element("option");
    			option38.textContent = "일";
    			t123 = space();
    			span12 = element("span");
    			span12.textContent = "안에 발생";
    			t125 = space();
    			i14 = element("i");
    			t126 = space();
    			div18 = element("div");
    			select26 = element("select");

    			for (let i = 0; i < each_blocks_4.length; i += 1) {
    				each_blocks_4[i].c();
    			}

    			t127 = space();
    			input13 = element("input");
    			t128 = space();
    			select27 = element("select");
    			option39 = element("option");
    			option39.textContent = "분";
    			option40 = element("option");
    			option40.textContent = "시간";
    			option41 = element("option");
    			option41.textContent = "일";
    			t132 = space();
    			span13 = element("span");
    			span13.textContent = "안에 발생";
    			t134 = space();
    			i15 = element("i");
    			t135 = space();
    			div19 = element("div");
    			select28 = element("select");

    			for (let i = 0; i < each_blocks_3.length; i += 1) {
    				each_blocks_3[i].c();
    			}

    			t136 = space();
    			input14 = element("input");
    			t137 = space();
    			select29 = element("select");
    			option42 = element("option");
    			option42.textContent = "분";
    			option43 = element("option");
    			option43.textContent = "시간";
    			option44 = element("option");
    			option44.textContent = "일";
    			t141 = space();
    			span14 = element("span");
    			span14.textContent = "안에 발생";
    			t143 = space();
    			i16 = element("i");
    			t144 = space();
    			div20 = element("div");
    			select30 = element("select");

    			for (let i = 0; i < each_blocks_2.length; i += 1) {
    				each_blocks_2[i].c();
    			}

    			t145 = space();
    			input15 = element("input");
    			t146 = space();
    			select31 = element("select");
    			option45 = element("option");
    			option45.textContent = "분";
    			option46 = element("option");
    			option46.textContent = "시간";
    			option47 = element("option");
    			option47.textContent = "일";
    			t150 = space();
    			span15 = element("span");
    			span15.textContent = "안에 발생";
    			t152 = space();
    			i17 = element("i");
    			t153 = space();
    			div21 = element("div");
    			select32 = element("select");

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].c();
    			}

    			t154 = space();
    			input16 = element("input");
    			t155 = space();
    			select33 = element("select");
    			option48 = element("option");
    			option48.textContent = "분";
    			option49 = element("option");
    			option49.textContent = "시간";
    			option50 = element("option");
    			option50.textContent = "일";
    			t159 = space();
    			span16 = element("span");
    			span16.textContent = "안에 발생";
    			t161 = space();
    			i18 = element("i");
    			t162 = space();
    			div22 = element("div");
    			select34 = element("select");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t163 = space();
    			input17 = element("input");
    			t164 = space();
    			select35 = element("select");
    			option51 = element("option");
    			option51.textContent = "분";
    			option52 = element("option");
    			option52.textContent = "시간";
    			option53 = element("option");
    			option53.textContent = "일";
    			t168 = space();
    			span17 = element("span");
    			span17.textContent = "안에 발생";
    			t170 = space();
    			i19 = element("i");
    			t171 = space();
    			i20 = element("i");
    			t172 = space();
    			button = element("button");
    			button.textContent = "Tier 추가";
    			attr_dev(h3, "class", "head-text");
    			add_location(h3, file$8, 21, 0, 882);
    			add_location(h50, file$8, 27, 8, 957);
    			add_location(div0, file$8, 26, 4, 943);
    			attr_dev(select0, "class", "custom-select filter-unit");
    			attr_dev(select0, "aria-label", "Default select example");
    			add_location(select0, file$8, 30, 8, 1037);
    			attr_dev(input0, "type", "text");
    			attr_dev(input0, "placeholder", "1000");
    			add_location(input0, file$8, 35, 8, 1233);
    			option0.selected = true;
    			option0.__value = "분";
    			option0.value = option0.__value;
    			add_location(option0, file$8, 37, 12, 1336);
    			option1.__value = "시간";
    			option1.value = option1.__value;
    			add_location(option1, file$8, 38, 12, 1376);
    			option2.__value = "일";
    			option2.value = option2.__value;
    			add_location(option2, file$8, 39, 12, 1408);
    			attr_dev(select1, "class", "custom-select lb-interval");
    			add_location(select1, file$8, 36, 8, 1281);
    			attr_dev(span0, "class", "text-1");
    			add_location(span0, file$8, 41, 8, 1453);
    			attr_dev(i0, "class", "bi bi-trash remove-filter");
    			add_location(i0, file$8, 42, 8, 1495);
    			attr_dev(div1, "class", "form-group");
    			add_location(div1, file$8, 29, 4, 1004);
    			attr_dev(select2, "class", "custom-select filter-unit");
    			attr_dev(select2, "aria-label", "Default select example");
    			add_location(select2, file$8, 45, 8, 1585);
    			attr_dev(input1, "type", "text");
    			attr_dev(input1, "placeholder", "1000");
    			add_location(input1, file$8, 50, 8, 1781);
    			option3.selected = true;
    			option3.__value = "분";
    			option3.value = option3.__value;
    			add_location(option3, file$8, 52, 12, 1884);
    			option4.__value = "시간";
    			option4.value = option4.__value;
    			add_location(option4, file$8, 53, 12, 1924);
    			option5.__value = "일";
    			option5.value = option5.__value;
    			add_location(option5, file$8, 54, 12, 1956);
    			attr_dev(select3, "class", "custom-select lb-interval");
    			add_location(select3, file$8, 51, 8, 1829);
    			attr_dev(span1, "class", "text-1");
    			add_location(span1, file$8, 56, 8, 2001);
    			attr_dev(i1, "class", "bi bi-trash remove-filter");
    			add_location(i1, file$8, 57, 8, 2043);
    			attr_dev(div2, "class", "form-group");
    			add_location(div2, file$8, 44, 4, 1552);
    			attr_dev(select4, "class", "custom-select filter-unit");
    			attr_dev(select4, "aria-label", "Default select example");
    			add_location(select4, file$8, 60, 8, 2133);
    			attr_dev(input2, "type", "text");
    			attr_dev(input2, "placeholder", "1000");
    			add_location(input2, file$8, 65, 8, 2329);
    			option6.selected = true;
    			option6.__value = "분";
    			option6.value = option6.__value;
    			add_location(option6, file$8, 67, 12, 2432);
    			option7.__value = "시간";
    			option7.value = option7.__value;
    			add_location(option7, file$8, 68, 12, 2472);
    			option8.__value = "일";
    			option8.value = option8.__value;
    			add_location(option8, file$8, 69, 12, 2504);
    			attr_dev(select5, "class", "custom-select lb-interval");
    			add_location(select5, file$8, 66, 8, 2377);
    			attr_dev(span2, "class", "text-1");
    			add_location(span2, file$8, 71, 8, 2549);
    			attr_dev(i2, "class", "bi bi-trash remove-filter");
    			add_location(i2, file$8, 72, 8, 2591);
    			attr_dev(div3, "class", "form-group");
    			add_location(div3, file$8, 59, 4, 2100);
    			attr_dev(select6, "class", "custom-select filter-unit");
    			attr_dev(select6, "aria-label", "Default select example");
    			add_location(select6, file$8, 75, 8, 2681);
    			attr_dev(input3, "type", "text");
    			attr_dev(input3, "placeholder", "1000");
    			add_location(input3, file$8, 80, 8, 2877);
    			option9.selected = true;
    			option9.__value = "분";
    			option9.value = option9.__value;
    			add_location(option9, file$8, 82, 12, 2980);
    			option10.__value = "시간";
    			option10.value = option10.__value;
    			add_location(option10, file$8, 83, 12, 3020);
    			option11.__value = "일";
    			option11.value = option11.__value;
    			add_location(option11, file$8, 84, 12, 3052);
    			attr_dev(select7, "class", "custom-select lb-interval");
    			add_location(select7, file$8, 81, 8, 2925);
    			attr_dev(span3, "class", "text-1");
    			add_location(span3, file$8, 86, 8, 3097);
    			attr_dev(i3, "class", "bi bi-trash remove-filter");
    			add_location(i3, file$8, 87, 8, 3139);
    			attr_dev(div4, "class", "form-group");
    			add_location(div4, file$8, 74, 4, 2648);
    			attr_dev(select8, "class", "custom-select filter-unit");
    			attr_dev(select8, "aria-label", "Default select example");
    			add_location(select8, file$8, 90, 8, 3229);
    			attr_dev(input4, "type", "text");
    			attr_dev(input4, "placeholder", "1000");
    			add_location(input4, file$8, 95, 8, 3425);
    			option12.selected = true;
    			option12.__value = "분";
    			option12.value = option12.__value;
    			add_location(option12, file$8, 97, 12, 3528);
    			option13.__value = "시간";
    			option13.value = option13.__value;
    			add_location(option13, file$8, 98, 12, 3568);
    			option14.__value = "일";
    			option14.value = option14.__value;
    			add_location(option14, file$8, 99, 12, 3600);
    			attr_dev(select9, "class", "custom-select lb-interval");
    			add_location(select9, file$8, 96, 8, 3473);
    			attr_dev(span4, "class", "text-1");
    			add_location(span4, file$8, 101, 8, 3645);
    			attr_dev(i4, "class", "bi bi-trash remove-filter");
    			add_location(i4, file$8, 102, 8, 3687);
    			attr_dev(div5, "class", "form-group");
    			add_location(div5, file$8, 89, 4, 3196);
    			attr_dev(select10, "class", "custom-select filter-unit");
    			attr_dev(select10, "aria-label", "Default select example");
    			add_location(select10, file$8, 105, 8, 3777);
    			attr_dev(input5, "type", "text");
    			attr_dev(input5, "placeholder", "1000");
    			add_location(input5, file$8, 110, 8, 3973);
    			option15.selected = true;
    			option15.__value = "분";
    			option15.value = option15.__value;
    			add_location(option15, file$8, 112, 12, 4076);
    			option16.__value = "시간";
    			option16.value = option16.__value;
    			add_location(option16, file$8, 113, 12, 4116);
    			option17.__value = "일";
    			option17.value = option17.__value;
    			add_location(option17, file$8, 114, 12, 4148);
    			attr_dev(select11, "class", "custom-select lb-interval");
    			add_location(select11, file$8, 111, 8, 4021);
    			attr_dev(span5, "class", "text-1");
    			add_location(span5, file$8, 116, 8, 4193);
    			attr_dev(i5, "class", "bi bi-trash remove-filter");
    			add_location(i5, file$8, 117, 8, 4235);
    			attr_dev(div6, "class", "form-group");
    			add_location(div6, file$8, 104, 4, 3744);
    			attr_dev(i6, "class", "bi bi-plus-circle");
    			add_location(i6, file$8, 119, 4, 4292);
    			attr_dev(div7, "class", "filter");
    			add_location(div7, file$8, 25, 0, 918);
    			add_location(h51, file$8, 128, 8, 4377);
    			add_location(div8, file$8, 127, 4, 4363);
    			attr_dev(select12, "class", "custom-select filter-unit");
    			attr_dev(select12, "aria-label", "Default select example");
    			add_location(select12, file$8, 131, 8, 4457);
    			attr_dev(input6, "type", "text");
    			attr_dev(input6, "placeholder", "1000");
    			add_location(input6, file$8, 136, 8, 4653);
    			option18.selected = true;
    			option18.__value = "분";
    			option18.value = option18.__value;
    			add_location(option18, file$8, 138, 12, 4756);
    			option19.__value = "시간";
    			option19.value = option19.__value;
    			add_location(option19, file$8, 139, 12, 4796);
    			option20.__value = "일";
    			option20.value = option20.__value;
    			add_location(option20, file$8, 140, 12, 4828);
    			attr_dev(select13, "class", "custom-select lb-interval");
    			add_location(select13, file$8, 137, 8, 4701);
    			attr_dev(span6, "class", "text-1");
    			add_location(span6, file$8, 142, 8, 4873);
    			attr_dev(i7, "class", "bi bi-trash remove-filter");
    			add_location(i7, file$8, 143, 8, 4915);
    			attr_dev(div9, "class", "form-group");
    			add_location(div9, file$8, 130, 4, 4424);
    			attr_dev(select14, "class", "custom-select filter-unit");
    			attr_dev(select14, "aria-label", "Default select example");
    			add_location(select14, file$8, 146, 8, 5005);
    			attr_dev(input7, "type", "text");
    			attr_dev(input7, "placeholder", "1000");
    			add_location(input7, file$8, 151, 8, 5201);
    			option21.selected = true;
    			option21.__value = "분";
    			option21.value = option21.__value;
    			add_location(option21, file$8, 153, 12, 5304);
    			option22.__value = "시간";
    			option22.value = option22.__value;
    			add_location(option22, file$8, 154, 12, 5344);
    			option23.__value = "일";
    			option23.value = option23.__value;
    			add_location(option23, file$8, 155, 12, 5376);
    			attr_dev(select15, "class", "custom-select lb-interval");
    			add_location(select15, file$8, 152, 8, 5249);
    			attr_dev(span7, "class", "text-1");
    			add_location(span7, file$8, 157, 8, 5421);
    			attr_dev(i8, "class", "bi bi-trash remove-filter");
    			add_location(i8, file$8, 158, 8, 5463);
    			attr_dev(div10, "class", "form-group");
    			add_location(div10, file$8, 145, 4, 4972);
    			attr_dev(select16, "class", "custom-select filter-unit");
    			attr_dev(select16, "aria-label", "Default select example");
    			add_location(select16, file$8, 161, 8, 5553);
    			attr_dev(input8, "type", "text");
    			attr_dev(input8, "placeholder", "1000");
    			add_location(input8, file$8, 166, 8, 5749);
    			option24.selected = true;
    			option24.__value = "분";
    			option24.value = option24.__value;
    			add_location(option24, file$8, 168, 12, 5852);
    			option25.__value = "시간";
    			option25.value = option25.__value;
    			add_location(option25, file$8, 169, 12, 5892);
    			option26.__value = "일";
    			option26.value = option26.__value;
    			add_location(option26, file$8, 170, 12, 5924);
    			attr_dev(select17, "class", "custom-select lb-interval");
    			add_location(select17, file$8, 167, 8, 5797);
    			attr_dev(span8, "class", "text-1");
    			add_location(span8, file$8, 172, 8, 5969);
    			attr_dev(i9, "class", "bi bi-trash remove-filter");
    			add_location(i9, file$8, 173, 8, 6011);
    			attr_dev(div11, "class", "form-group");
    			add_location(div11, file$8, 160, 4, 5520);
    			attr_dev(select18, "class", "custom-select filter-unit");
    			attr_dev(select18, "aria-label", "Default select example");
    			add_location(select18, file$8, 176, 8, 6101);
    			attr_dev(input9, "type", "text");
    			attr_dev(input9, "placeholder", "1000");
    			add_location(input9, file$8, 181, 8, 6297);
    			option27.selected = true;
    			option27.__value = "분";
    			option27.value = option27.__value;
    			add_location(option27, file$8, 183, 12, 6400);
    			option28.__value = "시간";
    			option28.value = option28.__value;
    			add_location(option28, file$8, 184, 12, 6440);
    			option29.__value = "일";
    			option29.value = option29.__value;
    			add_location(option29, file$8, 185, 12, 6472);
    			attr_dev(select19, "class", "custom-select lb-interval");
    			add_location(select19, file$8, 182, 8, 6345);
    			attr_dev(span9, "class", "text-1");
    			add_location(span9, file$8, 187, 8, 6517);
    			attr_dev(i10, "class", "bi bi-trash remove-filter");
    			add_location(i10, file$8, 188, 8, 6559);
    			attr_dev(div12, "class", "form-group");
    			add_location(div12, file$8, 175, 4, 6068);
    			attr_dev(select20, "class", "custom-select filter-unit");
    			attr_dev(select20, "aria-label", "Default select example");
    			add_location(select20, file$8, 191, 8, 6649);
    			attr_dev(input10, "type", "text");
    			attr_dev(input10, "placeholder", "1000");
    			add_location(input10, file$8, 196, 8, 6845);
    			option30.selected = true;
    			option30.__value = "분";
    			option30.value = option30.__value;
    			add_location(option30, file$8, 198, 12, 6948);
    			option31.__value = "시간";
    			option31.value = option31.__value;
    			add_location(option31, file$8, 199, 12, 6988);
    			option32.__value = "일";
    			option32.value = option32.__value;
    			add_location(option32, file$8, 200, 12, 7020);
    			attr_dev(select21, "class", "custom-select lb-interval");
    			add_location(select21, file$8, 197, 8, 6893);
    			attr_dev(span10, "class", "text-1");
    			add_location(span10, file$8, 202, 8, 7065);
    			attr_dev(i11, "class", "bi bi-trash remove-filter");
    			add_location(i11, file$8, 203, 8, 7107);
    			attr_dev(div13, "class", "form-group");
    			add_location(div13, file$8, 190, 4, 6616);
    			attr_dev(select22, "class", "custom-select filter-unit");
    			attr_dev(select22, "aria-label", "Default select example");
    			add_location(select22, file$8, 206, 8, 7197);
    			attr_dev(input11, "type", "text");
    			attr_dev(input11, "placeholder", "1000");
    			add_location(input11, file$8, 211, 8, 7393);
    			option33.selected = true;
    			option33.__value = "분";
    			option33.value = option33.__value;
    			add_location(option33, file$8, 213, 12, 7496);
    			option34.__value = "시간";
    			option34.value = option34.__value;
    			add_location(option34, file$8, 214, 12, 7536);
    			option35.__value = "일";
    			option35.value = option35.__value;
    			add_location(option35, file$8, 215, 12, 7568);
    			attr_dev(select23, "class", "custom-select lb-interval");
    			add_location(select23, file$8, 212, 8, 7441);
    			attr_dev(span11, "class", "text-1");
    			add_location(span11, file$8, 217, 8, 7613);
    			attr_dev(i12, "class", "bi bi-trash remove-filter");
    			add_location(i12, file$8, 218, 8, 7655);
    			attr_dev(div14, "class", "form-group");
    			add_location(div14, file$8, 205, 4, 7164);
    			attr_dev(i13, "class", "bi bi-plus-circle");
    			add_location(i13, file$8, 220, 4, 7712);
    			attr_dev(div15, "class", "filter");
    			add_location(div15, file$8, 126, 0, 4338);
    			add_location(h52, file$8, 230, 8, 7798);
    			add_location(div16, file$8, 229, 4, 7784);
    			attr_dev(select24, "class", "custom-select filter-unit");
    			attr_dev(select24, "aria-label", "Default select example");
    			add_location(select24, file$8, 233, 8, 7878);
    			attr_dev(input12, "type", "text");
    			attr_dev(input12, "placeholder", "1000");
    			add_location(input12, file$8, 238, 8, 8074);
    			option36.selected = true;
    			option36.__value = "분";
    			option36.value = option36.__value;
    			add_location(option36, file$8, 240, 12, 8177);
    			option37.__value = "시간";
    			option37.value = option37.__value;
    			add_location(option37, file$8, 241, 12, 8217);
    			option38.__value = "일";
    			option38.value = option38.__value;
    			add_location(option38, file$8, 242, 12, 8249);
    			attr_dev(select25, "class", "custom-select lb-interval");
    			add_location(select25, file$8, 239, 8, 8122);
    			attr_dev(span12, "class", "text-1");
    			add_location(span12, file$8, 244, 8, 8294);
    			attr_dev(i14, "class", "bi bi-trash remove-filter");
    			add_location(i14, file$8, 245, 8, 8336);
    			attr_dev(div17, "class", "form-group");
    			add_location(div17, file$8, 232, 4, 7845);
    			attr_dev(select26, "class", "custom-select filter-unit");
    			attr_dev(select26, "aria-label", "Default select example");
    			add_location(select26, file$8, 248, 8, 8426);
    			attr_dev(input13, "type", "text");
    			attr_dev(input13, "placeholder", "1000");
    			add_location(input13, file$8, 253, 8, 8622);
    			option39.selected = true;
    			option39.__value = "분";
    			option39.value = option39.__value;
    			add_location(option39, file$8, 255, 12, 8725);
    			option40.__value = "시간";
    			option40.value = option40.__value;
    			add_location(option40, file$8, 256, 12, 8765);
    			option41.__value = "일";
    			option41.value = option41.__value;
    			add_location(option41, file$8, 257, 12, 8797);
    			attr_dev(select27, "class", "custom-select lb-interval");
    			add_location(select27, file$8, 254, 8, 8670);
    			attr_dev(span13, "class", "text-1");
    			add_location(span13, file$8, 259, 8, 8842);
    			attr_dev(i15, "class", "bi bi-trash remove-filter");
    			add_location(i15, file$8, 260, 8, 8884);
    			attr_dev(div18, "class", "form-group");
    			add_location(div18, file$8, 247, 4, 8393);
    			attr_dev(select28, "class", "custom-select filter-unit");
    			attr_dev(select28, "aria-label", "Default select example");
    			add_location(select28, file$8, 263, 8, 8974);
    			attr_dev(input14, "type", "text");
    			attr_dev(input14, "placeholder", "1000");
    			add_location(input14, file$8, 268, 8, 9170);
    			option42.selected = true;
    			option42.__value = "분";
    			option42.value = option42.__value;
    			add_location(option42, file$8, 270, 12, 9273);
    			option43.__value = "시간";
    			option43.value = option43.__value;
    			add_location(option43, file$8, 271, 12, 9313);
    			option44.__value = "일";
    			option44.value = option44.__value;
    			add_location(option44, file$8, 272, 12, 9345);
    			attr_dev(select29, "class", "custom-select lb-interval");
    			add_location(select29, file$8, 269, 8, 9218);
    			attr_dev(span14, "class", "text-1");
    			add_location(span14, file$8, 274, 8, 9390);
    			attr_dev(i16, "class", "bi bi-trash remove-filter");
    			add_location(i16, file$8, 275, 8, 9432);
    			attr_dev(div19, "class", "form-group");
    			add_location(div19, file$8, 262, 4, 8941);
    			attr_dev(select30, "class", "custom-select filter-unit");
    			attr_dev(select30, "aria-label", "Default select example");
    			add_location(select30, file$8, 278, 8, 9522);
    			attr_dev(input15, "type", "text");
    			attr_dev(input15, "placeholder", "1000");
    			add_location(input15, file$8, 283, 8, 9718);
    			option45.selected = true;
    			option45.__value = "분";
    			option45.value = option45.__value;
    			add_location(option45, file$8, 285, 12, 9821);
    			option46.__value = "시간";
    			option46.value = option46.__value;
    			add_location(option46, file$8, 286, 12, 9861);
    			option47.__value = "일";
    			option47.value = option47.__value;
    			add_location(option47, file$8, 287, 12, 9893);
    			attr_dev(select31, "class", "custom-select lb-interval");
    			add_location(select31, file$8, 284, 8, 9766);
    			attr_dev(span15, "class", "text-1");
    			add_location(span15, file$8, 289, 8, 9938);
    			attr_dev(i17, "class", "bi bi-trash remove-filter");
    			add_location(i17, file$8, 290, 8, 9980);
    			attr_dev(div20, "class", "form-group");
    			add_location(div20, file$8, 277, 4, 9489);
    			attr_dev(select32, "class", "custom-select filter-unit");
    			attr_dev(select32, "aria-label", "Default select example");
    			add_location(select32, file$8, 293, 8, 10070);
    			attr_dev(input16, "type", "text");
    			attr_dev(input16, "placeholder", "1000");
    			add_location(input16, file$8, 298, 8, 10266);
    			option48.selected = true;
    			option48.__value = "분";
    			option48.value = option48.__value;
    			add_location(option48, file$8, 300, 12, 10369);
    			option49.__value = "시간";
    			option49.value = option49.__value;
    			add_location(option49, file$8, 301, 12, 10409);
    			option50.__value = "일";
    			option50.value = option50.__value;
    			add_location(option50, file$8, 302, 12, 10441);
    			attr_dev(select33, "class", "custom-select lb-interval");
    			add_location(select33, file$8, 299, 8, 10314);
    			attr_dev(span16, "class", "text-1");
    			add_location(span16, file$8, 304, 8, 10486);
    			attr_dev(i18, "class", "bi bi-trash remove-filter");
    			add_location(i18, file$8, 305, 8, 10528);
    			attr_dev(div21, "class", "form-group");
    			add_location(div21, file$8, 292, 4, 10037);
    			attr_dev(select34, "class", "custom-select filter-unit");
    			attr_dev(select34, "aria-label", "Default select example");
    			add_location(select34, file$8, 308, 8, 10618);
    			attr_dev(input17, "type", "text");
    			attr_dev(input17, "placeholder", "1000");
    			add_location(input17, file$8, 313, 8, 10814);
    			option51.selected = true;
    			option51.__value = "분";
    			option51.value = option51.__value;
    			add_location(option51, file$8, 315, 12, 10917);
    			option52.__value = "시간";
    			option52.value = option52.__value;
    			add_location(option52, file$8, 316, 12, 10957);
    			option53.__value = "일";
    			option53.value = option53.__value;
    			add_location(option53, file$8, 317, 12, 10989);
    			attr_dev(select35, "class", "custom-select lb-interval");
    			add_location(select35, file$8, 314, 8, 10862);
    			attr_dev(span17, "class", "text-1");
    			add_location(span17, file$8, 319, 8, 11034);
    			attr_dev(i19, "class", "bi bi-trash remove-filter");
    			add_location(i19, file$8, 320, 8, 11076);
    			attr_dev(div22, "class", "form-group");
    			add_location(div22, file$8, 307, 4, 10585);
    			attr_dev(i20, "class", "bi bi-plus-circle");
    			add_location(i20, file$8, 322, 4, 11133);
    			attr_dev(div23, "class", "filter");
    			add_location(div23, file$8, 228, 0, 7759);
    			attr_dev(button, "type", "button");
    			attr_dev(button, "class", "btn btn-primary");
    			attr_dev(button, "data-dismiss", "modal");
    			add_location(button, file$8, 325, 0, 11175);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h3, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, div7, anchor);
    			append_dev(div7, div0);
    			append_dev(div0, h50);
    			append_dev(div7, t3);
    			append_dev(div7, div1);
    			append_dev(div1, select0);

    			for (let i = 0; i < each_blocks_17.length; i += 1) {
    				each_blocks_17[i].m(select0, null);
    			}

    			append_dev(div1, t4);
    			append_dev(div1, input0);
    			append_dev(div1, t5);
    			append_dev(div1, select1);
    			append_dev(select1, option0);
    			append_dev(select1, option1);
    			append_dev(select1, option2);
    			append_dev(div1, t9);
    			append_dev(div1, span0);
    			append_dev(div1, t11);
    			append_dev(div1, i0);
    			append_dev(div7, t12);
    			append_dev(div7, div2);
    			append_dev(div2, select2);

    			for (let i = 0; i < each_blocks_16.length; i += 1) {
    				each_blocks_16[i].m(select2, null);
    			}

    			append_dev(div2, t13);
    			append_dev(div2, input1);
    			append_dev(div2, t14);
    			append_dev(div2, select3);
    			append_dev(select3, option3);
    			append_dev(select3, option4);
    			append_dev(select3, option5);
    			append_dev(div2, t18);
    			append_dev(div2, span1);
    			append_dev(div2, t20);
    			append_dev(div2, i1);
    			append_dev(div7, t21);
    			append_dev(div7, div3);
    			append_dev(div3, select4);

    			for (let i = 0; i < each_blocks_15.length; i += 1) {
    				each_blocks_15[i].m(select4, null);
    			}

    			append_dev(div3, t22);
    			append_dev(div3, input2);
    			append_dev(div3, t23);
    			append_dev(div3, select5);
    			append_dev(select5, option6);
    			append_dev(select5, option7);
    			append_dev(select5, option8);
    			append_dev(div3, t27);
    			append_dev(div3, span2);
    			append_dev(div3, t29);
    			append_dev(div3, i2);
    			append_dev(div7, t30);
    			append_dev(div7, div4);
    			append_dev(div4, select6);

    			for (let i = 0; i < each_blocks_14.length; i += 1) {
    				each_blocks_14[i].m(select6, null);
    			}

    			append_dev(div4, t31);
    			append_dev(div4, input3);
    			append_dev(div4, t32);
    			append_dev(div4, select7);
    			append_dev(select7, option9);
    			append_dev(select7, option10);
    			append_dev(select7, option11);
    			append_dev(div4, t36);
    			append_dev(div4, span3);
    			append_dev(div4, t38);
    			append_dev(div4, i3);
    			append_dev(div7, t39);
    			append_dev(div7, div5);
    			append_dev(div5, select8);

    			for (let i = 0; i < each_blocks_13.length; i += 1) {
    				each_blocks_13[i].m(select8, null);
    			}

    			append_dev(div5, t40);
    			append_dev(div5, input4);
    			append_dev(div5, t41);
    			append_dev(div5, select9);
    			append_dev(select9, option12);
    			append_dev(select9, option13);
    			append_dev(select9, option14);
    			append_dev(div5, t45);
    			append_dev(div5, span4);
    			append_dev(div5, t47);
    			append_dev(div5, i4);
    			append_dev(div7, t48);
    			append_dev(div7, div6);
    			append_dev(div6, select10);

    			for (let i = 0; i < each_blocks_12.length; i += 1) {
    				each_blocks_12[i].m(select10, null);
    			}

    			append_dev(div6, t49);
    			append_dev(div6, input5);
    			append_dev(div6, t50);
    			append_dev(div6, select11);
    			append_dev(select11, option15);
    			append_dev(select11, option16);
    			append_dev(select11, option17);
    			append_dev(div6, t54);
    			append_dev(div6, span5);
    			append_dev(div6, t56);
    			append_dev(div6, i5);
    			append_dev(div7, t57);
    			append_dev(div7, i6);
    			insert_dev(target, t58, anchor);
    			insert_dev(target, div15, anchor);
    			append_dev(div15, div8);
    			append_dev(div8, h51);
    			append_dev(div15, t60);
    			append_dev(div15, div9);
    			append_dev(div9, select12);

    			for (let i = 0; i < each_blocks_11.length; i += 1) {
    				each_blocks_11[i].m(select12, null);
    			}

    			append_dev(div9, t61);
    			append_dev(div9, input6);
    			append_dev(div9, t62);
    			append_dev(div9, select13);
    			append_dev(select13, option18);
    			append_dev(select13, option19);
    			append_dev(select13, option20);
    			append_dev(div9, t66);
    			append_dev(div9, span6);
    			append_dev(div9, t68);
    			append_dev(div9, i7);
    			append_dev(div15, t69);
    			append_dev(div15, div10);
    			append_dev(div10, select14);

    			for (let i = 0; i < each_blocks_10.length; i += 1) {
    				each_blocks_10[i].m(select14, null);
    			}

    			append_dev(div10, t70);
    			append_dev(div10, input7);
    			append_dev(div10, t71);
    			append_dev(div10, select15);
    			append_dev(select15, option21);
    			append_dev(select15, option22);
    			append_dev(select15, option23);
    			append_dev(div10, t75);
    			append_dev(div10, span7);
    			append_dev(div10, t77);
    			append_dev(div10, i8);
    			append_dev(div15, t78);
    			append_dev(div15, div11);
    			append_dev(div11, select16);

    			for (let i = 0; i < each_blocks_9.length; i += 1) {
    				each_blocks_9[i].m(select16, null);
    			}

    			append_dev(div11, t79);
    			append_dev(div11, input8);
    			append_dev(div11, t80);
    			append_dev(div11, select17);
    			append_dev(select17, option24);
    			append_dev(select17, option25);
    			append_dev(select17, option26);
    			append_dev(div11, t84);
    			append_dev(div11, span8);
    			append_dev(div11, t86);
    			append_dev(div11, i9);
    			append_dev(div15, t87);
    			append_dev(div15, div12);
    			append_dev(div12, select18);

    			for (let i = 0; i < each_blocks_8.length; i += 1) {
    				each_blocks_8[i].m(select18, null);
    			}

    			append_dev(div12, t88);
    			append_dev(div12, input9);
    			append_dev(div12, t89);
    			append_dev(div12, select19);
    			append_dev(select19, option27);
    			append_dev(select19, option28);
    			append_dev(select19, option29);
    			append_dev(div12, t93);
    			append_dev(div12, span9);
    			append_dev(div12, t95);
    			append_dev(div12, i10);
    			append_dev(div15, t96);
    			append_dev(div15, div13);
    			append_dev(div13, select20);

    			for (let i = 0; i < each_blocks_7.length; i += 1) {
    				each_blocks_7[i].m(select20, null);
    			}

    			append_dev(div13, t97);
    			append_dev(div13, input10);
    			append_dev(div13, t98);
    			append_dev(div13, select21);
    			append_dev(select21, option30);
    			append_dev(select21, option31);
    			append_dev(select21, option32);
    			append_dev(div13, t102);
    			append_dev(div13, span10);
    			append_dev(div13, t104);
    			append_dev(div13, i11);
    			append_dev(div15, t105);
    			append_dev(div15, div14);
    			append_dev(div14, select22);

    			for (let i = 0; i < each_blocks_6.length; i += 1) {
    				each_blocks_6[i].m(select22, null);
    			}

    			append_dev(div14, t106);
    			append_dev(div14, input11);
    			append_dev(div14, t107);
    			append_dev(div14, select23);
    			append_dev(select23, option33);
    			append_dev(select23, option34);
    			append_dev(select23, option35);
    			append_dev(div14, t111);
    			append_dev(div14, span11);
    			append_dev(div14, t113);
    			append_dev(div14, i12);
    			append_dev(div15, t114);
    			append_dev(div15, i13);
    			insert_dev(target, t115, anchor);
    			insert_dev(target, div23, anchor);
    			append_dev(div23, div16);
    			append_dev(div16, h52);
    			append_dev(div23, t117);
    			append_dev(div23, div17);
    			append_dev(div17, select24);

    			for (let i = 0; i < each_blocks_5.length; i += 1) {
    				each_blocks_5[i].m(select24, null);
    			}

    			append_dev(div17, t118);
    			append_dev(div17, input12);
    			append_dev(div17, t119);
    			append_dev(div17, select25);
    			append_dev(select25, option36);
    			append_dev(select25, option37);
    			append_dev(select25, option38);
    			append_dev(div17, t123);
    			append_dev(div17, span12);
    			append_dev(div17, t125);
    			append_dev(div17, i14);
    			append_dev(div23, t126);
    			append_dev(div23, div18);
    			append_dev(div18, select26);

    			for (let i = 0; i < each_blocks_4.length; i += 1) {
    				each_blocks_4[i].m(select26, null);
    			}

    			append_dev(div18, t127);
    			append_dev(div18, input13);
    			append_dev(div18, t128);
    			append_dev(div18, select27);
    			append_dev(select27, option39);
    			append_dev(select27, option40);
    			append_dev(select27, option41);
    			append_dev(div18, t132);
    			append_dev(div18, span13);
    			append_dev(div18, t134);
    			append_dev(div18, i15);
    			append_dev(div23, t135);
    			append_dev(div23, div19);
    			append_dev(div19, select28);

    			for (let i = 0; i < each_blocks_3.length; i += 1) {
    				each_blocks_3[i].m(select28, null);
    			}

    			append_dev(div19, t136);
    			append_dev(div19, input14);
    			append_dev(div19, t137);
    			append_dev(div19, select29);
    			append_dev(select29, option42);
    			append_dev(select29, option43);
    			append_dev(select29, option44);
    			append_dev(div19, t141);
    			append_dev(div19, span14);
    			append_dev(div19, t143);
    			append_dev(div19, i16);
    			append_dev(div23, t144);
    			append_dev(div23, div20);
    			append_dev(div20, select30);

    			for (let i = 0; i < each_blocks_2.length; i += 1) {
    				each_blocks_2[i].m(select30, null);
    			}

    			append_dev(div20, t145);
    			append_dev(div20, input15);
    			append_dev(div20, t146);
    			append_dev(div20, select31);
    			append_dev(select31, option45);
    			append_dev(select31, option46);
    			append_dev(select31, option47);
    			append_dev(div20, t150);
    			append_dev(div20, span15);
    			append_dev(div20, t152);
    			append_dev(div20, i17);
    			append_dev(div23, t153);
    			append_dev(div23, div21);
    			append_dev(div21, select32);

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].m(select32, null);
    			}

    			append_dev(div21, t154);
    			append_dev(div21, input16);
    			append_dev(div21, t155);
    			append_dev(div21, select33);
    			append_dev(select33, option48);
    			append_dev(select33, option49);
    			append_dev(select33, option50);
    			append_dev(div21, t159);
    			append_dev(div21, span16);
    			append_dev(div21, t161);
    			append_dev(div21, i18);
    			append_dev(div23, t162);
    			append_dev(div23, div22);
    			append_dev(div22, select34);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(select34, null);
    			}

    			append_dev(div22, t163);
    			append_dev(div22, input17);
    			append_dev(div22, t164);
    			append_dev(div22, select35);
    			append_dev(select35, option51);
    			append_dev(select35, option52);
    			append_dev(select35, option53);
    			append_dev(div22, t168);
    			append_dev(div22, span17);
    			append_dev(div22, t170);
    			append_dev(div22, i19);
    			append_dev(div23, t171);
    			append_dev(div23, i20);
    			insert_dev(target, t172, anchor);
    			insert_dev(target, button, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*rows*/ 1) {
    				each_value_17 = /*rows*/ ctx[0];
    				validate_each_argument(each_value_17);
    				let i;

    				for (i = 0; i < each_value_17.length; i += 1) {
    					const child_ctx = get_each_context_17(ctx, each_value_17, i);

    					if (each_blocks_17[i]) {
    						each_blocks_17[i].p(child_ctx, dirty);
    					} else {
    						each_blocks_17[i] = create_each_block_17(child_ctx);
    						each_blocks_17[i].c();
    						each_blocks_17[i].m(select0, null);
    					}
    				}

    				for (; i < each_blocks_17.length; i += 1) {
    					each_blocks_17[i].d(1);
    				}

    				each_blocks_17.length = each_value_17.length;
    			}

    			if (dirty[0] & /*rows*/ 1) {
    				each_value_16 = /*rows*/ ctx[0];
    				validate_each_argument(each_value_16);
    				let i;

    				for (i = 0; i < each_value_16.length; i += 1) {
    					const child_ctx = get_each_context_16(ctx, each_value_16, i);

    					if (each_blocks_16[i]) {
    						each_blocks_16[i].p(child_ctx, dirty);
    					} else {
    						each_blocks_16[i] = create_each_block_16(child_ctx);
    						each_blocks_16[i].c();
    						each_blocks_16[i].m(select2, null);
    					}
    				}

    				for (; i < each_blocks_16.length; i += 1) {
    					each_blocks_16[i].d(1);
    				}

    				each_blocks_16.length = each_value_16.length;
    			}

    			if (dirty[0] & /*rows*/ 1) {
    				each_value_15 = /*rows*/ ctx[0];
    				validate_each_argument(each_value_15);
    				let i;

    				for (i = 0; i < each_value_15.length; i += 1) {
    					const child_ctx = get_each_context_15(ctx, each_value_15, i);

    					if (each_blocks_15[i]) {
    						each_blocks_15[i].p(child_ctx, dirty);
    					} else {
    						each_blocks_15[i] = create_each_block_15(child_ctx);
    						each_blocks_15[i].c();
    						each_blocks_15[i].m(select4, null);
    					}
    				}

    				for (; i < each_blocks_15.length; i += 1) {
    					each_blocks_15[i].d(1);
    				}

    				each_blocks_15.length = each_value_15.length;
    			}

    			if (dirty[0] & /*rows*/ 1) {
    				each_value_14 = /*rows*/ ctx[0];
    				validate_each_argument(each_value_14);
    				let i;

    				for (i = 0; i < each_value_14.length; i += 1) {
    					const child_ctx = get_each_context_14(ctx, each_value_14, i);

    					if (each_blocks_14[i]) {
    						each_blocks_14[i].p(child_ctx, dirty);
    					} else {
    						each_blocks_14[i] = create_each_block_14(child_ctx);
    						each_blocks_14[i].c();
    						each_blocks_14[i].m(select6, null);
    					}
    				}

    				for (; i < each_blocks_14.length; i += 1) {
    					each_blocks_14[i].d(1);
    				}

    				each_blocks_14.length = each_value_14.length;
    			}

    			if (dirty[0] & /*rows*/ 1) {
    				each_value_13 = /*rows*/ ctx[0];
    				validate_each_argument(each_value_13);
    				let i;

    				for (i = 0; i < each_value_13.length; i += 1) {
    					const child_ctx = get_each_context_13(ctx, each_value_13, i);

    					if (each_blocks_13[i]) {
    						each_blocks_13[i].p(child_ctx, dirty);
    					} else {
    						each_blocks_13[i] = create_each_block_13(child_ctx);
    						each_blocks_13[i].c();
    						each_blocks_13[i].m(select8, null);
    					}
    				}

    				for (; i < each_blocks_13.length; i += 1) {
    					each_blocks_13[i].d(1);
    				}

    				each_blocks_13.length = each_value_13.length;
    			}

    			if (dirty[0] & /*rows*/ 1) {
    				each_value_12 = /*rows*/ ctx[0];
    				validate_each_argument(each_value_12);
    				let i;

    				for (i = 0; i < each_value_12.length; i += 1) {
    					const child_ctx = get_each_context_12(ctx, each_value_12, i);

    					if (each_blocks_12[i]) {
    						each_blocks_12[i].p(child_ctx, dirty);
    					} else {
    						each_blocks_12[i] = create_each_block_12(child_ctx);
    						each_blocks_12[i].c();
    						each_blocks_12[i].m(select10, null);
    					}
    				}

    				for (; i < each_blocks_12.length; i += 1) {
    					each_blocks_12[i].d(1);
    				}

    				each_blocks_12.length = each_value_12.length;
    			}

    			if (dirty[0] & /*rows*/ 1) {
    				each_value_11 = /*rows*/ ctx[0];
    				validate_each_argument(each_value_11);
    				let i;

    				for (i = 0; i < each_value_11.length; i += 1) {
    					const child_ctx = get_each_context_11(ctx, each_value_11, i);

    					if (each_blocks_11[i]) {
    						each_blocks_11[i].p(child_ctx, dirty);
    					} else {
    						each_blocks_11[i] = create_each_block_11(child_ctx);
    						each_blocks_11[i].c();
    						each_blocks_11[i].m(select12, null);
    					}
    				}

    				for (; i < each_blocks_11.length; i += 1) {
    					each_blocks_11[i].d(1);
    				}

    				each_blocks_11.length = each_value_11.length;
    			}

    			if (dirty[0] & /*rows*/ 1) {
    				each_value_10 = /*rows*/ ctx[0];
    				validate_each_argument(each_value_10);
    				let i;

    				for (i = 0; i < each_value_10.length; i += 1) {
    					const child_ctx = get_each_context_10(ctx, each_value_10, i);

    					if (each_blocks_10[i]) {
    						each_blocks_10[i].p(child_ctx, dirty);
    					} else {
    						each_blocks_10[i] = create_each_block_10(child_ctx);
    						each_blocks_10[i].c();
    						each_blocks_10[i].m(select14, null);
    					}
    				}

    				for (; i < each_blocks_10.length; i += 1) {
    					each_blocks_10[i].d(1);
    				}

    				each_blocks_10.length = each_value_10.length;
    			}

    			if (dirty[0] & /*rows*/ 1) {
    				each_value_9 = /*rows*/ ctx[0];
    				validate_each_argument(each_value_9);
    				let i;

    				for (i = 0; i < each_value_9.length; i += 1) {
    					const child_ctx = get_each_context_9(ctx, each_value_9, i);

    					if (each_blocks_9[i]) {
    						each_blocks_9[i].p(child_ctx, dirty);
    					} else {
    						each_blocks_9[i] = create_each_block_9(child_ctx);
    						each_blocks_9[i].c();
    						each_blocks_9[i].m(select16, null);
    					}
    				}

    				for (; i < each_blocks_9.length; i += 1) {
    					each_blocks_9[i].d(1);
    				}

    				each_blocks_9.length = each_value_9.length;
    			}

    			if (dirty[0] & /*rows*/ 1) {
    				each_value_8 = /*rows*/ ctx[0];
    				validate_each_argument(each_value_8);
    				let i;

    				for (i = 0; i < each_value_8.length; i += 1) {
    					const child_ctx = get_each_context_8(ctx, each_value_8, i);

    					if (each_blocks_8[i]) {
    						each_blocks_8[i].p(child_ctx, dirty);
    					} else {
    						each_blocks_8[i] = create_each_block_8(child_ctx);
    						each_blocks_8[i].c();
    						each_blocks_8[i].m(select18, null);
    					}
    				}

    				for (; i < each_blocks_8.length; i += 1) {
    					each_blocks_8[i].d(1);
    				}

    				each_blocks_8.length = each_value_8.length;
    			}

    			if (dirty[0] & /*rows*/ 1) {
    				each_value_7 = /*rows*/ ctx[0];
    				validate_each_argument(each_value_7);
    				let i;

    				for (i = 0; i < each_value_7.length; i += 1) {
    					const child_ctx = get_each_context_7(ctx, each_value_7, i);

    					if (each_blocks_7[i]) {
    						each_blocks_7[i].p(child_ctx, dirty);
    					} else {
    						each_blocks_7[i] = create_each_block_7(child_ctx);
    						each_blocks_7[i].c();
    						each_blocks_7[i].m(select20, null);
    					}
    				}

    				for (; i < each_blocks_7.length; i += 1) {
    					each_blocks_7[i].d(1);
    				}

    				each_blocks_7.length = each_value_7.length;
    			}

    			if (dirty[0] & /*rows*/ 1) {
    				each_value_6 = /*rows*/ ctx[0];
    				validate_each_argument(each_value_6);
    				let i;

    				for (i = 0; i < each_value_6.length; i += 1) {
    					const child_ctx = get_each_context_6(ctx, each_value_6, i);

    					if (each_blocks_6[i]) {
    						each_blocks_6[i].p(child_ctx, dirty);
    					} else {
    						each_blocks_6[i] = create_each_block_6(child_ctx);
    						each_blocks_6[i].c();
    						each_blocks_6[i].m(select22, null);
    					}
    				}

    				for (; i < each_blocks_6.length; i += 1) {
    					each_blocks_6[i].d(1);
    				}

    				each_blocks_6.length = each_value_6.length;
    			}

    			if (dirty[0] & /*rows*/ 1) {
    				each_value_5 = /*rows*/ ctx[0];
    				validate_each_argument(each_value_5);
    				let i;

    				for (i = 0; i < each_value_5.length; i += 1) {
    					const child_ctx = get_each_context_5(ctx, each_value_5, i);

    					if (each_blocks_5[i]) {
    						each_blocks_5[i].p(child_ctx, dirty);
    					} else {
    						each_blocks_5[i] = create_each_block_5(child_ctx);
    						each_blocks_5[i].c();
    						each_blocks_5[i].m(select24, null);
    					}
    				}

    				for (; i < each_blocks_5.length; i += 1) {
    					each_blocks_5[i].d(1);
    				}

    				each_blocks_5.length = each_value_5.length;
    			}

    			if (dirty[0] & /*rows*/ 1) {
    				each_value_4 = /*rows*/ ctx[0];
    				validate_each_argument(each_value_4);
    				let i;

    				for (i = 0; i < each_value_4.length; i += 1) {
    					const child_ctx = get_each_context_4(ctx, each_value_4, i);

    					if (each_blocks_4[i]) {
    						each_blocks_4[i].p(child_ctx, dirty);
    					} else {
    						each_blocks_4[i] = create_each_block_4(child_ctx);
    						each_blocks_4[i].c();
    						each_blocks_4[i].m(select26, null);
    					}
    				}

    				for (; i < each_blocks_4.length; i += 1) {
    					each_blocks_4[i].d(1);
    				}

    				each_blocks_4.length = each_value_4.length;
    			}

    			if (dirty[0] & /*rows*/ 1) {
    				each_value_3 = /*rows*/ ctx[0];
    				validate_each_argument(each_value_3);
    				let i;

    				for (i = 0; i < each_value_3.length; i += 1) {
    					const child_ctx = get_each_context_3(ctx, each_value_3, i);

    					if (each_blocks_3[i]) {
    						each_blocks_3[i].p(child_ctx, dirty);
    					} else {
    						each_blocks_3[i] = create_each_block_3(child_ctx);
    						each_blocks_3[i].c();
    						each_blocks_3[i].m(select28, null);
    					}
    				}

    				for (; i < each_blocks_3.length; i += 1) {
    					each_blocks_3[i].d(1);
    				}

    				each_blocks_3.length = each_value_3.length;
    			}

    			if (dirty[0] & /*rows*/ 1) {
    				each_value_2 = /*rows*/ ctx[0];
    				validate_each_argument(each_value_2);
    				let i;

    				for (i = 0; i < each_value_2.length; i += 1) {
    					const child_ctx = get_each_context_2(ctx, each_value_2, i);

    					if (each_blocks_2[i]) {
    						each_blocks_2[i].p(child_ctx, dirty);
    					} else {
    						each_blocks_2[i] = create_each_block_2(child_ctx);
    						each_blocks_2[i].c();
    						each_blocks_2[i].m(select30, null);
    					}
    				}

    				for (; i < each_blocks_2.length; i += 1) {
    					each_blocks_2[i].d(1);
    				}

    				each_blocks_2.length = each_value_2.length;
    			}

    			if (dirty[0] & /*rows*/ 1) {
    				each_value_1 = /*rows*/ ctx[0];
    				validate_each_argument(each_value_1);
    				let i;

    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1(ctx, each_value_1, i);

    					if (each_blocks_1[i]) {
    						each_blocks_1[i].p(child_ctx, dirty);
    					} else {
    						each_blocks_1[i] = create_each_block_1(child_ctx);
    						each_blocks_1[i].c();
    						each_blocks_1[i].m(select32, null);
    					}
    				}

    				for (; i < each_blocks_1.length; i += 1) {
    					each_blocks_1[i].d(1);
    				}

    				each_blocks_1.length = each_value_1.length;
    			}

    			if (dirty[0] & /*rows*/ 1) {
    				each_value = /*rows*/ ctx[0];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(select34, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h3);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(div7);
    			destroy_each(each_blocks_17, detaching);
    			destroy_each(each_blocks_16, detaching);
    			destroy_each(each_blocks_15, detaching);
    			destroy_each(each_blocks_14, detaching);
    			destroy_each(each_blocks_13, detaching);
    			destroy_each(each_blocks_12, detaching);
    			if (detaching) detach_dev(t58);
    			if (detaching) detach_dev(div15);
    			destroy_each(each_blocks_11, detaching);
    			destroy_each(each_blocks_10, detaching);
    			destroy_each(each_blocks_9, detaching);
    			destroy_each(each_blocks_8, detaching);
    			destroy_each(each_blocks_7, detaching);
    			destroy_each(each_blocks_6, detaching);
    			if (detaching) detach_dev(t115);
    			if (detaching) detach_dev(div23);
    			destroy_each(each_blocks_5, detaching);
    			destroy_each(each_blocks_4, detaching);
    			destroy_each(each_blocks_3, detaching);
    			destroy_each(each_blocks_2, detaching);
    			destroy_each(each_blocks_1, detaching);
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(t172);
    			if (detaching) detach_dev(button);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$9.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$9($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Attr', slots, []);

    	let rows = [
    		"Click-Referrer Unit",
    		"Click-Identifier(adid/idfa) Unit",
    		"Click-Fingerprint Unit",
    		"Click-IP Unit",
    		"Google UAC ACe",
    		"Google UAC",
    		"Apple Search Ads(Click)",
    		"Facebook",
    		"Impression-Identifier(adid/idfa) Unit",
    		"Impression-Fingerprint Unit",
    		"Impression-IP Unit",
    		"Click-Cookie Unit",
    		"Playable-Identifier(adid/idfa) Unit",
    		"Playable-Fingerprint Unit",
    		"Playable-IP Unit",
    		"Video-Identifier(adid/idfa) Unit",
    		"Video-Fingerprint Unit",
    		"Video-IP Unit",
    		"Kakao",
    		"TikTok(Click)",
    		"TikTok(Impression)"
    	];

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Attr> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ rows });

    	$$self.$inject_state = $$props => {
    		if ('rows' in $$props) $$invalidate(0, rows = $$props.rows);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [rows];
    }

    class Attr extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$9, create_fragment$9, safe_not_equal, {}, null, [-1, -1]);

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Attr",
    			options,
    			id: create_fragment$9.name
    		});
    	}
    }

    /* src/SDKGuide2.svelte generated by Svelte v3.50.0 */

    function create_fragment$8(ctx) {
    	const block = {
    		c: noop,
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: noop,
    		p: noop,
    		i: noop,
    		o: noop,
    		d: noop
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$8.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$8($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('SDKGuide2', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<SDKGuide2> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class SDKGuide2 extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$8, create_fragment$8, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "SDKGuide2",
    			options,
    			id: create_fragment$8.name
    		});
    	}
    }

    /* src/sdkguide1/code1.svelte generated by Svelte v3.50.0 */

    const file$7 = "src/sdkguide1/code1.svelte";

    function create_fragment$7(ctx) {
    	let div9;
    	let div0;
    	let t1;
    	let br0;
    	let t2;
    	let div1;
    	let t3;
    	let t4;
    	let t5;
    	let br1;
    	let t6;
    	let div2;
    	let t8;
    	let div3;
    	let t10;
    	let br2;
    	let t11;
    	let div4;
    	let t13;
    	let div5;
    	let t15;
    	let br3;
    	let t16;
    	let div6;
    	let t18;
    	let div7;
    	let t20;
    	let br4;
    	let t21;
    	let div8;
    	let t23;
    	let br5;
    	let t24;
    	let t25;

    	const block = {
    		c: function create() {
    			div9 = element("div");
    			div0 = element("div");
    			div0.textContent = "import Pettri";
    			t1 = space();
    			br0 = element("br");
    			t2 = space();
    			div1 = element("div");
    			t3 = text("func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool ");
    			t4 = text(/*leftbrace*/ ctx[0]);
    			t5 = space();
    			br1 = element("br");
    			t6 = space();
    			div2 = element("div");
    			div2.textContent = "// 페트리 객체를 불러옵니다.";
    			t8 = space();
    			div3 = element("div");
    			div3.textContent = "let pettri = Pettri.getInstance";
    			t10 = space();
    			br2 = element("br");
    			t11 = space();
    			div4 = element("div");
    			div4.textContent = "// 콘솔에서 발급받은 액세스키와 시크릿키를 입력합니다.";
    			t13 = space();
    			div5 = element("div");
    			div5.textContent = "pettri.configure(accessKey : \"...\", secretKey : \"...\")";
    			t15 = space();
    			br3 = element("br");
    			t16 = space();
    			div6 = element("div");
    			div6.textContent = "// 페트리 트래커를 초기화합니다.";
    			t18 = space();
    			div7 = element("div");
    			div7.textContent = "pettri.init";
    			t20 = space();
    			br4 = element("br");
    			t21 = space();
    			div8 = element("div");
    			div8.textContent = "return true";
    			t23 = space();
    			br5 = element("br");
    			t24 = space();
    			t25 = text(/*rightbrace*/ ctx[1]);
    			attr_dev(div0, "class", "line");
    			add_location(div0, file$7, 5, 4, 93);
    			add_location(br0, file$7, 6, 4, 135);
    			attr_dev(div1, "class", "line");
    			add_location(div1, file$7, 7, 4, 144);
    			add_location(br1, file$7, 8, 4, 324);
    			attr_dev(div2, "class", "remark left-space");
    			add_location(div2, file$7, 9, 4, 333);
    			attr_dev(div3, "class", "line left-space");
    			add_location(div3, file$7, 10, 4, 392);
    			add_location(br2, file$7, 11, 4, 463);
    			attr_dev(div4, "class", "remark left-space");
    			add_location(div4, file$7, 12, 4, 472);
    			attr_dev(div5, "class", "line left-space");
    			add_location(div5, file$7, 13, 4, 545);
    			add_location(br3, file$7, 16, 4, 653);
    			attr_dev(div6, "class", "remark left-space");
    			add_location(div6, file$7, 17, 4, 662);
    			attr_dev(div7, "class", "line left-space");
    			add_location(div7, file$7, 18, 4, 723);
    			add_location(br4, file$7, 21, 4, 788);
    			attr_dev(div8, "class", "line left-space");
    			add_location(div8, file$7, 22, 4, 797);
    			add_location(br5, file$7, 23, 4, 848);
    			attr_dev(div9, "class", "code");
    			add_location(div9, file$7, 4, 0, 70);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div9, anchor);
    			append_dev(div9, div0);
    			append_dev(div9, t1);
    			append_dev(div9, br0);
    			append_dev(div9, t2);
    			append_dev(div9, div1);
    			append_dev(div1, t3);
    			append_dev(div1, t4);
    			append_dev(div9, t5);
    			append_dev(div9, br1);
    			append_dev(div9, t6);
    			append_dev(div9, div2);
    			append_dev(div9, t8);
    			append_dev(div9, div3);
    			append_dev(div9, t10);
    			append_dev(div9, br2);
    			append_dev(div9, t11);
    			append_dev(div9, div4);
    			append_dev(div9, t13);
    			append_dev(div9, div5);
    			append_dev(div9, t15);
    			append_dev(div9, br3);
    			append_dev(div9, t16);
    			append_dev(div9, div6);
    			append_dev(div9, t18);
    			append_dev(div9, div7);
    			append_dev(div9, t20);
    			append_dev(div9, br4);
    			append_dev(div9, t21);
    			append_dev(div9, div8);
    			append_dev(div9, t23);
    			append_dev(div9, br5);
    			append_dev(div9, t24);
    			append_dev(div9, t25);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*leftbrace*/ 1) set_data_dev(t4, /*leftbrace*/ ctx[0]);
    			if (dirty & /*rightbrace*/ 2) set_data_dev(t25, /*rightbrace*/ ctx[1]);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div9);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$7.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$7($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Code1', slots, []);
    	let { leftbrace } = $$props;
    	let { rightbrace } = $$props;
    	const writable_props = ['leftbrace', 'rightbrace'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Code1> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ('leftbrace' in $$props) $$invalidate(0, leftbrace = $$props.leftbrace);
    		if ('rightbrace' in $$props) $$invalidate(1, rightbrace = $$props.rightbrace);
    	};

    	$$self.$capture_state = () => ({ leftbrace, rightbrace });

    	$$self.$inject_state = $$props => {
    		if ('leftbrace' in $$props) $$invalidate(0, leftbrace = $$props.leftbrace);
    		if ('rightbrace' in $$props) $$invalidate(1, rightbrace = $$props.rightbrace);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [leftbrace, rightbrace];
    }

    class Code1 extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$7, create_fragment$7, safe_not_equal, { leftbrace: 0, rightbrace: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Code1",
    			options,
    			id: create_fragment$7.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*leftbrace*/ ctx[0] === undefined && !('leftbrace' in props)) {
    			console.warn("<Code1> was created without expected prop 'leftbrace'");
    		}

    		if (/*rightbrace*/ ctx[1] === undefined && !('rightbrace' in props)) {
    			console.warn("<Code1> was created without expected prop 'rightbrace'");
    		}
    	}

    	get leftbrace() {
    		throw new Error("<Code1>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set leftbrace(value) {
    		throw new Error("<Code1>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get rightbrace() {
    		throw new Error("<Code1>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set rightbrace(value) {
    		throw new Error("<Code1>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/sdkguide1/code2.svelte generated by Svelte v3.50.0 */

    const file$6 = "src/sdkguide1/code2.svelte";

    function create_fragment$6(ctx) {
    	let div13;
    	let div0;
    	let t1;
    	let br0;
    	let t2;
    	let div1;
    	let t3;
    	let t4;
    	let t5;
    	let br1;
    	let t6;
    	let div2;
    	let t8;
    	let div3;
    	let t10;
    	let br2;
    	let t11;
    	let div4;
    	let t13;
    	let div5;
    	let t15;
    	let br3;
    	let t16;
    	let div6;
    	let t18;
    	let div7;
    	let t20;
    	let br4;
    	let t21;
    	let div8;
    	let t23;
    	let div9;
    	let t25;
    	let br5;
    	let t26;
    	let div10;
    	let t28;
    	let div11;
    	let t30;
    	let br6;
    	let t31;
    	let div12;
    	let t33;
    	let br7;
    	let t34;
    	let t35;

    	const block = {
    		c: function create() {
    			div13 = element("div");
    			div0 = element("div");
    			div0.textContent = "import Pettri";
    			t1 = space();
    			br0 = element("br");
    			t2 = space();
    			div1 = element("div");
    			t3 = text("func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool ");
    			t4 = text(/*leftbrace*/ ctx[0]);
    			t5 = space();
    			br1 = element("br");
    			t6 = space();
    			div2 = element("div");
    			div2.textContent = "// 페트리 객체를 불러옵니다.";
    			t8 = space();
    			div3 = element("div");
    			div3.textContent = "let pettri = Pettri.getInstance";
    			t10 = space();
    			br2 = element("br");
    			t11 = space();
    			div4 = element("div");
    			div4.textContent = "// 콘솔에서 발급받은 액세스키와 시크릿키를 입력합니다.";
    			t13 = space();
    			div5 = element("div");
    			div5.textContent = "pettri.configure(accessKey : \"...\", secretKey : \"...\")";
    			t15 = space();
    			br3 = element("br");
    			t16 = space();
    			div6 = element("div");
    			div6.textContent = "// 페트리 트래커를 초기화합니다.";
    			t18 = space();
    			div7 = element("div");
    			div7.textContent = "pettri.init";
    			t20 = space();
    			br4 = element("br");
    			t21 = space();
    			div8 = element("div");
    			div8.textContent = "// 이벤트 개수를 기준으로 페트리에 업로드 요청합니다.";
    			t23 = space();
    			div9 = element("div");
    			div9.textContent = "pettri.setUploadMetric(Pettri.UploadMetric.Event)";
    			t25 = space();
    			br5 = element("br");
    			t26 = space();
    			div10 = element("div");
    			div10.textContent = "// 기준에 해당하는 개수가 되면 패트리로 업로드가 요청이 됩니다. 5번 이벤트가 발생되었을 경우 페트리에 업로드 됩니다.";
    			t28 = space();
    			div11 = element("div");
    			div11.textContent = "pettri.setUploadMetric(5)";
    			t30 = space();
    			br6 = element("br");
    			t31 = space();
    			div12 = element("div");
    			div12.textContent = "return true";
    			t33 = space();
    			br7 = element("br");
    			t34 = space();
    			t35 = text(/*rightbrace*/ ctx[1]);
    			attr_dev(div0, "class", "line");
    			add_location(div0, file$6, 5, 4, 93);
    			add_location(br0, file$6, 6, 4, 135);
    			attr_dev(div1, "class", "line");
    			add_location(div1, file$6, 7, 4, 144);
    			add_location(br1, file$6, 8, 4, 324);
    			attr_dev(div2, "class", "remark left-space");
    			add_location(div2, file$6, 9, 4, 333);
    			attr_dev(div3, "class", "line left-space");
    			add_location(div3, file$6, 10, 4, 392);
    			add_location(br2, file$6, 11, 4, 463);
    			attr_dev(div4, "class", "remark left-space");
    			add_location(div4, file$6, 12, 4, 472);
    			attr_dev(div5, "class", "line left-space");
    			add_location(div5, file$6, 13, 4, 545);
    			add_location(br3, file$6, 16, 4, 653);
    			attr_dev(div6, "class", "remark left-space");
    			add_location(div6, file$6, 17, 4, 662);
    			attr_dev(div7, "class", "line left-space");
    			add_location(div7, file$6, 18, 4, 723);
    			add_location(br4, file$6, 21, 4, 788);
    			attr_dev(div8, "class", "remark left-space");
    			add_location(div8, file$6, 22, 4, 797);
    			attr_dev(div9, "class", "line left-space");
    			add_location(div9, file$6, 23, 4, 870);
    			add_location(br5, file$6, 26, 4, 973);
    			attr_dev(div10, "class", "remark left-space");
    			add_location(div10, file$6, 27, 4, 982);
    			attr_dev(div11, "class", "line left-space");
    			add_location(div11, file$6, 28, 4, 1092);
    			add_location(br6, file$6, 31, 4, 1171);
    			attr_dev(div12, "class", "line left-space");
    			add_location(div12, file$6, 32, 4, 1180);
    			add_location(br7, file$6, 33, 4, 1231);
    			attr_dev(div13, "class", "code");
    			add_location(div13, file$6, 4, 0, 70);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div13, anchor);
    			append_dev(div13, div0);
    			append_dev(div13, t1);
    			append_dev(div13, br0);
    			append_dev(div13, t2);
    			append_dev(div13, div1);
    			append_dev(div1, t3);
    			append_dev(div1, t4);
    			append_dev(div13, t5);
    			append_dev(div13, br1);
    			append_dev(div13, t6);
    			append_dev(div13, div2);
    			append_dev(div13, t8);
    			append_dev(div13, div3);
    			append_dev(div13, t10);
    			append_dev(div13, br2);
    			append_dev(div13, t11);
    			append_dev(div13, div4);
    			append_dev(div13, t13);
    			append_dev(div13, div5);
    			append_dev(div13, t15);
    			append_dev(div13, br3);
    			append_dev(div13, t16);
    			append_dev(div13, div6);
    			append_dev(div13, t18);
    			append_dev(div13, div7);
    			append_dev(div13, t20);
    			append_dev(div13, br4);
    			append_dev(div13, t21);
    			append_dev(div13, div8);
    			append_dev(div13, t23);
    			append_dev(div13, div9);
    			append_dev(div13, t25);
    			append_dev(div13, br5);
    			append_dev(div13, t26);
    			append_dev(div13, div10);
    			append_dev(div13, t28);
    			append_dev(div13, div11);
    			append_dev(div13, t30);
    			append_dev(div13, br6);
    			append_dev(div13, t31);
    			append_dev(div13, div12);
    			append_dev(div13, t33);
    			append_dev(div13, br7);
    			append_dev(div13, t34);
    			append_dev(div13, t35);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*leftbrace*/ 1) set_data_dev(t4, /*leftbrace*/ ctx[0]);
    			if (dirty & /*rightbrace*/ 2) set_data_dev(t35, /*rightbrace*/ ctx[1]);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div13);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$6.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$6($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Code2', slots, []);
    	let { leftbrace } = $$props;
    	let { rightbrace } = $$props;
    	const writable_props = ['leftbrace', 'rightbrace'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Code2> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ('leftbrace' in $$props) $$invalidate(0, leftbrace = $$props.leftbrace);
    		if ('rightbrace' in $$props) $$invalidate(1, rightbrace = $$props.rightbrace);
    	};

    	$$self.$capture_state = () => ({ leftbrace, rightbrace });

    	$$self.$inject_state = $$props => {
    		if ('leftbrace' in $$props) $$invalidate(0, leftbrace = $$props.leftbrace);
    		if ('rightbrace' in $$props) $$invalidate(1, rightbrace = $$props.rightbrace);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [leftbrace, rightbrace];
    }

    class Code2 extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$6, create_fragment$6, safe_not_equal, { leftbrace: 0, rightbrace: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Code2",
    			options,
    			id: create_fragment$6.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*leftbrace*/ ctx[0] === undefined && !('leftbrace' in props)) {
    			console.warn("<Code2> was created without expected prop 'leftbrace'");
    		}

    		if (/*rightbrace*/ ctx[1] === undefined && !('rightbrace' in props)) {
    			console.warn("<Code2> was created without expected prop 'rightbrace'");
    		}
    	}

    	get leftbrace() {
    		throw new Error("<Code2>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set leftbrace(value) {
    		throw new Error("<Code2>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get rightbrace() {
    		throw new Error("<Code2>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set rightbrace(value) {
    		throw new Error("<Code2>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/sdkguide1/code3.svelte generated by Svelte v3.50.0 */

    const file$5 = "src/sdkguide1/code3.svelte";

    function create_fragment$5(ctx) {
    	let div0;
    	let t1;
    	let div14;
    	let div1;
    	let t3;
    	let br0;
    	let t4;
    	let div2;
    	let t5;
    	let t6;
    	let t7;
    	let br1;
    	let t8;
    	let div3;
    	let t10;
    	let div4;
    	let t12;
    	let br2;
    	let t13;
    	let div5;
    	let t15;
    	let div6;
    	let t17;
    	let br3;
    	let t18;
    	let div7;
    	let t20;
    	let div8;
    	let t22;
    	let br4;
    	let t23;
    	let div9;
    	let t25;
    	let div10;
    	let t27;
    	let br5;
    	let t28;
    	let div11;
    	let t30;
    	let div12;
    	let t32;
    	let br6;
    	let t33;
    	let div13;
    	let t35;
    	let br7;
    	let t36;
    	let t37;

    	const block = {
    		c: function create() {
    			div0 = element("div");
    			div0.textContent = "시간 경과";
    			t1 = text("\n일정 시간이 경과 되었을 때 페트리 서버로 측정된 이벤트 데이터를 업로드 하도록 합니다.\n");
    			div14 = element("div");
    			div1 = element("div");
    			div1.textContent = "import Pettri";
    			t3 = space();
    			br0 = element("br");
    			t4 = space();
    			div2 = element("div");
    			t5 = text("func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool ");
    			t6 = text(/*leftbrace*/ ctx[0]);
    			t7 = space();
    			br1 = element("br");
    			t8 = space();
    			div3 = element("div");
    			div3.textContent = "// 페트리 객체를 불러옵니다.";
    			t10 = space();
    			div4 = element("div");
    			div4.textContent = "let pettri = Pettri.getInstance";
    			t12 = space();
    			br2 = element("br");
    			t13 = space();
    			div5 = element("div");
    			div5.textContent = "// 콘솔에서 발급받은 액세스키와 시크릿키를 입력합니다.";
    			t15 = space();
    			div6 = element("div");
    			div6.textContent = "pettri.configure(accessKey : \"...\", secretKey : \"...\")";
    			t17 = space();
    			br3 = element("br");
    			t18 = space();
    			div7 = element("div");
    			div7.textContent = "// 페트리 트래커를 초기화합니다.";
    			t20 = space();
    			div8 = element("div");
    			div8.textContent = "pettri.init";
    			t22 = space();
    			br4 = element("br");
    			t23 = space();
    			div9 = element("div");
    			div9.textContent = "// 이벤트 개수를 기준으로 페트리에 업로드 요청합니다.";
    			t25 = space();
    			div10 = element("div");
    			div10.textContent = "pettri.setUploadMetric(Pettri.UploadMetric.Time)";
    			t27 = space();
    			br5 = element("br");
    			t28 = space();
    			div11 = element("div");
    			div11.textContent = "// 기준에 해당하는 개수가 되면 패트리로 업로드가 요청이 됩니다. 5초가 경과되었을 경우 페트리에 업로드 이벤트 요청이 됩니다.";
    			t30 = space();
    			div12 = element("div");
    			div12.textContent = "pettri.setUploadMetric(5)";
    			t32 = space();
    			br6 = element("br");
    			t33 = space();
    			div13 = element("div");
    			div13.textContent = "return true";
    			t35 = space();
    			br7 = element("br");
    			t36 = space();
    			t37 = text(/*rightbrace*/ ctx[1]);
    			attr_dev(div0, "class", "sub-title-2 mg-top");
    			add_location(div0, file$5, 5, 0, 71);
    			attr_dev(div1, "class", "line");
    			add_location(div1, file$5, 8, 4, 188);
    			add_location(br0, file$5, 9, 4, 230);
    			attr_dev(div2, "class", "line");
    			add_location(div2, file$5, 10, 4, 239);
    			add_location(br1, file$5, 11, 4, 419);
    			attr_dev(div3, "class", "remark left-space");
    			add_location(div3, file$5, 12, 4, 428);
    			attr_dev(div4, "class", "line left-space");
    			add_location(div4, file$5, 13, 4, 487);
    			add_location(br2, file$5, 14, 4, 558);
    			attr_dev(div5, "class", "remark left-space");
    			add_location(div5, file$5, 15, 4, 567);
    			attr_dev(div6, "class", "line left-space");
    			add_location(div6, file$5, 16, 4, 640);
    			add_location(br3, file$5, 19, 4, 748);
    			attr_dev(div7, "class", "remark left-space");
    			add_location(div7, file$5, 20, 4, 757);
    			attr_dev(div8, "class", "line left-space");
    			add_location(div8, file$5, 21, 4, 818);
    			add_location(br4, file$5, 24, 4, 883);
    			attr_dev(div9, "class", "remark left-space");
    			add_location(div9, file$5, 25, 4, 892);
    			attr_dev(div10, "class", "line left-space");
    			add_location(div10, file$5, 26, 4, 965);
    			add_location(br5, file$5, 29, 4, 1067);
    			attr_dev(div11, "class", "remark left-space");
    			add_location(div11, file$5, 30, 4, 1076);
    			attr_dev(div12, "class", "line left-space");
    			add_location(div12, file$5, 31, 4, 1190);
    			add_location(br6, file$5, 34, 4, 1269);
    			attr_dev(div13, "class", "line left-space");
    			add_location(div13, file$5, 35, 4, 1278);
    			add_location(br7, file$5, 36, 4, 1329);
    			attr_dev(div14, "class", "code");
    			add_location(div14, file$5, 7, 0, 165);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div0, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, div14, anchor);
    			append_dev(div14, div1);
    			append_dev(div14, t3);
    			append_dev(div14, br0);
    			append_dev(div14, t4);
    			append_dev(div14, div2);
    			append_dev(div2, t5);
    			append_dev(div2, t6);
    			append_dev(div14, t7);
    			append_dev(div14, br1);
    			append_dev(div14, t8);
    			append_dev(div14, div3);
    			append_dev(div14, t10);
    			append_dev(div14, div4);
    			append_dev(div14, t12);
    			append_dev(div14, br2);
    			append_dev(div14, t13);
    			append_dev(div14, div5);
    			append_dev(div14, t15);
    			append_dev(div14, div6);
    			append_dev(div14, t17);
    			append_dev(div14, br3);
    			append_dev(div14, t18);
    			append_dev(div14, div7);
    			append_dev(div14, t20);
    			append_dev(div14, div8);
    			append_dev(div14, t22);
    			append_dev(div14, br4);
    			append_dev(div14, t23);
    			append_dev(div14, div9);
    			append_dev(div14, t25);
    			append_dev(div14, div10);
    			append_dev(div14, t27);
    			append_dev(div14, br5);
    			append_dev(div14, t28);
    			append_dev(div14, div11);
    			append_dev(div14, t30);
    			append_dev(div14, div12);
    			append_dev(div14, t32);
    			append_dev(div14, br6);
    			append_dev(div14, t33);
    			append_dev(div14, div13);
    			append_dev(div14, t35);
    			append_dev(div14, br7);
    			append_dev(div14, t36);
    			append_dev(div14, t37);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*leftbrace*/ 1) set_data_dev(t6, /*leftbrace*/ ctx[0]);
    			if (dirty & /*rightbrace*/ 2) set_data_dev(t37, /*rightbrace*/ ctx[1]);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div0);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(div14);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$5.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$5($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Code3', slots, []);
    	let { leftbrace } = $$props;
    	let { rightbrace } = $$props;
    	const writable_props = ['leftbrace', 'rightbrace'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Code3> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ('leftbrace' in $$props) $$invalidate(0, leftbrace = $$props.leftbrace);
    		if ('rightbrace' in $$props) $$invalidate(1, rightbrace = $$props.rightbrace);
    	};

    	$$self.$capture_state = () => ({ leftbrace, rightbrace });

    	$$self.$inject_state = $$props => {
    		if ('leftbrace' in $$props) $$invalidate(0, leftbrace = $$props.leftbrace);
    		if ('rightbrace' in $$props) $$invalidate(1, rightbrace = $$props.rightbrace);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [leftbrace, rightbrace];
    }

    class Code3 extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$5, create_fragment$5, safe_not_equal, { leftbrace: 0, rightbrace: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Code3",
    			options,
    			id: create_fragment$5.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*leftbrace*/ ctx[0] === undefined && !('leftbrace' in props)) {
    			console.warn("<Code3> was created without expected prop 'leftbrace'");
    		}

    		if (/*rightbrace*/ ctx[1] === undefined && !('rightbrace' in props)) {
    			console.warn("<Code3> was created without expected prop 'rightbrace'");
    		}
    	}

    	get leftbrace() {
    		throw new Error("<Code3>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set leftbrace(value) {
    		throw new Error("<Code3>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get rightbrace() {
    		throw new Error("<Code3>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set rightbrace(value) {
    		throw new Error("<Code3>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/sdkguide1/page1.svelte generated by Svelte v3.50.0 */
    const file$4 = "src/sdkguide1/page1.svelte";

    function create_fragment$4(ctx) {
    	let h3;
    	let t1;
    	let div0;
    	let t3;
    	let div1;
    	let t4;
    	let code1;
    	let t5;
    	let div2;
    	let t7;
    	let div3;
    	let t9;
    	let code2;
    	let t10;
    	let code3;
    	let current;

    	code1 = new Code1({
    			props: {
    				leftbrace: /*leftbrace*/ ctx[0],
    				rightbrace: /*rightbrace*/ ctx[1]
    			},
    			$$inline: true
    		});

    	code2 = new Code2({
    			props: {
    				leftbrace: /*leftbrace*/ ctx[0],
    				rightbrace: /*rightbrace*/ ctx[1]
    			},
    			$$inline: true
    		});

    	code3 = new Code3({
    			props: {
    				leftbrace: /*leftbrace*/ ctx[0],
    				rightbrace: /*rightbrace*/ ctx[1]
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			h3 = element("h3");
    			h3.textContent = "페트리 연동하기[iOS]";
    			t1 = space();
    			div0 = element("div");
    			div0.textContent = "페트리 초기화";
    			t3 = space();
    			div1 = element("div");
    			t4 = text("\r\n코드에서 다음과 같이 페트리 SDK를 import하여 초기화합니다.\r\n\r\n");
    			create_component(code1.$$.fragment);
    			t5 = space();
    			div2 = element("div");
    			div2.textContent = "이벤트 업로드 주기 설정";
    			t7 = space();
    			div3 = element("div");
    			div3.textContent = "이벤트 개수 누적";
    			t9 = text("\r\n일정 개수의 이벤트가 발생되었을 때 페트리 서버로 측정된 이벤트 데이터를 업로드 하도록 합니다.\r\n\r\n");
    			create_component(code2.$$.fragment);
    			t10 = space();
    			create_component(code3.$$.fragment);
    			attr_dev(h3, "class", "head-text");
    			add_location(h3, file$4, 9, 0, 200);
    			attr_dev(div0, "class", "title");
    			add_location(div0, file$4, 10, 0, 242);
    			attr_dev(div1, "class", "text");
    			add_location(div1, file$4, 11, 0, 276);
    			attr_dev(div2, "class", "sub-title-1");
    			add_location(div2, file$4, 16, 0, 401);
    			attr_dev(div3, "class", "sub-title-2");
    			add_location(div3, file$4, 17, 0, 447);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h3, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, div0, anchor);
    			insert_dev(target, t3, anchor);
    			insert_dev(target, div1, anchor);
    			insert_dev(target, t4, anchor);
    			mount_component(code1, target, anchor);
    			insert_dev(target, t5, anchor);
    			insert_dev(target, div2, anchor);
    			insert_dev(target, t7, anchor);
    			insert_dev(target, div3, anchor);
    			insert_dev(target, t9, anchor);
    			mount_component(code2, target, anchor);
    			insert_dev(target, t10, anchor);
    			mount_component(code3, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(code1.$$.fragment, local);
    			transition_in(code2.$$.fragment, local);
    			transition_in(code3.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(code1.$$.fragment, local);
    			transition_out(code2.$$.fragment, local);
    			transition_out(code3.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h3);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(div0);
    			if (detaching) detach_dev(t3);
    			if (detaching) detach_dev(div1);
    			if (detaching) detach_dev(t4);
    			destroy_component(code1, detaching);
    			if (detaching) detach_dev(t5);
    			if (detaching) detach_dev(div2);
    			if (detaching) detach_dev(t7);
    			if (detaching) detach_dev(div3);
    			if (detaching) detach_dev(t9);
    			destroy_component(code2, detaching);
    			if (detaching) detach_dev(t10);
    			destroy_component(code3, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$4.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$4($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Page1', slots, []);
    	let leftbrace = "{";
    	let rightbrace = "}";
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Page1> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({
    		Code1,
    		Code2,
    		Code3,
    		leftbrace,
    		rightbrace
    	});

    	$$self.$inject_state = $$props => {
    		if ('leftbrace' in $$props) $$invalidate(0, leftbrace = $$props.leftbrace);
    		if ('rightbrace' in $$props) $$invalidate(1, rightbrace = $$props.rightbrace);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [leftbrace, rightbrace];
    }

    class Page1 extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Page1",
    			options,
    			id: create_fragment$4.name
    		});
    	}
    }

    /* src/sdkguide1/code4.svelte generated by Svelte v3.50.0 */

    const file$3 = "src/sdkguide1/code4.svelte";

    function create_fragment$3(ctx) {
    	let div7;
    	let div0;
    	let t1;
    	let br0;
    	let t2;
    	let div1;
    	let t3;
    	let t4;
    	let t5;
    	let br1;
    	let t6;
    	let div2;
    	let t8;
    	let div3;
    	let t10;
    	let br2;
    	let t11;
    	let div4;
    	let t13;
    	let div5;
    	let t15;
    	let br3;
    	let t16;
    	let div6;
    	let t18;
    	let br4;
    	let t19;
    	let t20;

    	const block = {
    		c: function create() {
    			div7 = element("div");
    			div0 = element("div");
    			div0.textContent = "import Pettri";
    			t1 = space();
    			br0 = element("br");
    			t2 = space();
    			div1 = element("div");
    			t3 = text("func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey : Any] = [:]) -> Bool ");
    			t4 = text(/*leftbrace*/ ctx[0]);
    			t5 = space();
    			br1 = element("br");
    			t6 = space();
    			div2 = element("div");
    			div2.textContent = "// 페트리 객체를 불러옵니다.";
    			t8 = space();
    			div3 = element("div");
    			div3.textContent = "let pettri = Pettri.getInstance";
    			t10 = space();
    			br2 = element("br");
    			t11 = space();
    			div4 = element("div");
    			div4.textContent = "// 딥 링크가 오픈되었음을 패트리 트래커 서버로 알리는 함수";
    			t13 = space();
    			div5 = element("div");
    			div5.textContent = "pettri.open(Pettri.LinkType.DeepLink, url:url)";
    			t15 = space();
    			br3 = element("br");
    			t16 = space();
    			div6 = element("div");
    			div6.textContent = "return true";
    			t18 = space();
    			br4 = element("br");
    			t19 = space();
    			t20 = text(/*rightbrace*/ ctx[1]);
    			attr_dev(div0, "class", "line");
    			add_location(div0, file$3, 5, 4, 93);
    			add_location(br0, file$3, 6, 4, 135);
    			attr_dev(div1, "class", "line");
    			add_location(div1, file$3, 7, 4, 144);
    			add_location(br1, file$3, 8, 4, 302);
    			attr_dev(div2, "class", "remark left-space");
    			add_location(div2, file$3, 9, 4, 311);
    			attr_dev(div3, "class", "line left-space");
    			add_location(div3, file$3, 10, 4, 370);
    			add_location(br2, file$3, 11, 4, 441);
    			attr_dev(div4, "class", "remark left-space");
    			add_location(div4, file$3, 12, 4, 450);
    			attr_dev(div5, "class", "line left-space");
    			add_location(div5, file$3, 13, 4, 526);
    			add_location(br3, file$3, 16, 4, 626);
    			attr_dev(div6, "class", "line left-space");
    			add_location(div6, file$3, 17, 4, 635);
    			add_location(br4, file$3, 18, 4, 686);
    			attr_dev(div7, "class", "code");
    			add_location(div7, file$3, 4, 0, 70);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div7, anchor);
    			append_dev(div7, div0);
    			append_dev(div7, t1);
    			append_dev(div7, br0);
    			append_dev(div7, t2);
    			append_dev(div7, div1);
    			append_dev(div1, t3);
    			append_dev(div1, t4);
    			append_dev(div7, t5);
    			append_dev(div7, br1);
    			append_dev(div7, t6);
    			append_dev(div7, div2);
    			append_dev(div7, t8);
    			append_dev(div7, div3);
    			append_dev(div7, t10);
    			append_dev(div7, br2);
    			append_dev(div7, t11);
    			append_dev(div7, div4);
    			append_dev(div7, t13);
    			append_dev(div7, div5);
    			append_dev(div7, t15);
    			append_dev(div7, br3);
    			append_dev(div7, t16);
    			append_dev(div7, div6);
    			append_dev(div7, t18);
    			append_dev(div7, br4);
    			append_dev(div7, t19);
    			append_dev(div7, t20);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*leftbrace*/ 1) set_data_dev(t4, /*leftbrace*/ ctx[0]);
    			if (dirty & /*rightbrace*/ 2) set_data_dev(t20, /*rightbrace*/ ctx[1]);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div7);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Code4', slots, []);
    	let { leftbrace } = $$props;
    	let { rightbrace } = $$props;
    	const writable_props = ['leftbrace', 'rightbrace'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Code4> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ('leftbrace' in $$props) $$invalidate(0, leftbrace = $$props.leftbrace);
    		if ('rightbrace' in $$props) $$invalidate(1, rightbrace = $$props.rightbrace);
    	};

    	$$self.$capture_state = () => ({ leftbrace, rightbrace });

    	$$self.$inject_state = $$props => {
    		if ('leftbrace' in $$props) $$invalidate(0, leftbrace = $$props.leftbrace);
    		if ('rightbrace' in $$props) $$invalidate(1, rightbrace = $$props.rightbrace);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [leftbrace, rightbrace];
    }

    class Code4 extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, { leftbrace: 0, rightbrace: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Code4",
    			options,
    			id: create_fragment$3.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*leftbrace*/ ctx[0] === undefined && !('leftbrace' in props)) {
    			console.warn("<Code4> was created without expected prop 'leftbrace'");
    		}

    		if (/*rightbrace*/ ctx[1] === undefined && !('rightbrace' in props)) {
    			console.warn("<Code4> was created without expected prop 'rightbrace'");
    		}
    	}

    	get leftbrace() {
    		throw new Error("<Code4>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set leftbrace(value) {
    		throw new Error("<Code4>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get rightbrace() {
    		throw new Error("<Code4>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set rightbrace(value) {
    		throw new Error("<Code4>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/sdkguide1/page2.svelte generated by Svelte v3.50.0 */
    const file$2 = "src/sdkguide1/page2.svelte";

    function create_fragment$2(ctx) {
    	let h3;
    	let t1;
    	let div0;
    	let t3;
    	let div1;
    	let t5;
    	let code4;
    	let current;

    	code4 = new Code4({
    			props: {
    				leftbrace: /*leftbrace*/ ctx[0],
    				rightbrace: /*rightbrace*/ ctx[1]
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			h3 = element("h3");
    			h3.textContent = "페트리 연동하기[iOS]";
    			t1 = space();
    			div0 = element("div");
    			div0.textContent = "딥 링크 이벤트 분석";
    			t3 = text("\r\n딥 링크가 오픈되는 시점에 페트리 트래킹 코드를 호출함으로써, 콘솔에서 딥 링크 발생 이벤트에 대한 추적이 가능합니다.\r\n");
    			div1 = element("div");
    			div1.textContent = "링크 오픈 시점";
    			t5 = text("\r\n딥 링크가 오픈되는 시점에 다음과 같이 트래킹 코드를 추가하여, 패트리에 딥 링크가 오픈되었음을 알립니다.\r\n\r\n");
    			create_component(code4.$$.fragment);
    			attr_dev(h3, "class", "head-text");
    			add_location(h3, file$2, 5, 0, 116);
    			attr_dev(div0, "class", "title");
    			add_location(div0, file$2, 6, 0, 158);
    			attr_dev(div1, "class", "sub-title-1 no-mgtop");
    			add_location(div1, file$2, 8, 0, 264);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h3, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, div0, anchor);
    			insert_dev(target, t3, anchor);
    			insert_dev(target, div1, anchor);
    			insert_dev(target, t5, anchor);
    			mount_component(code4, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(code4.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(code4.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h3);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(div0);
    			if (detaching) detach_dev(t3);
    			if (detaching) detach_dev(div1);
    			if (detaching) detach_dev(t5);
    			destroy_component(code4, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Page2', slots, []);
    	let leftbrace = "{";
    	let rightbrace = "}";
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Page2> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ Code4, leftbrace, rightbrace });

    	$$self.$inject_state = $$props => {
    		if ('leftbrace' in $$props) $$invalidate(0, leftbrace = $$props.leftbrace);
    		if ('rightbrace' in $$props) $$invalidate(1, rightbrace = $$props.rightbrace);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [leftbrace, rightbrace];
    }

    class Page2 extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Page2",
    			options,
    			id: create_fragment$2.name
    		});
    	}
    }

    /* src/sdkguide1/page3.svelte generated by Svelte v3.50.0 */

    const file$1 = "src/sdkguide1/page3.svelte";

    function create_fragment$1(ctx) {
    	let h3;
    	let t1;
    	let div;
    	let t3;
    	let ul4;
    	let li3;
    	let t4;
    	let ul0;
    	let li0;
    	let t6;
    	let li1;
    	let t8;
    	let li2;
    	let t10;
    	let li4;
    	let t12;
    	let li10;
    	let t13;
    	let ul1;
    	let li5;
    	let t15;
    	let li6;
    	let t17;
    	let li7;
    	let t19;
    	let li8;
    	let t21;
    	let li9;
    	let t23;
    	let li21;
    	let t24;
    	let ul2;
    	let li11;
    	let t26;
    	let li12;
    	let t28;
    	let li13;
    	let t30;
    	let li14;
    	let t32;
    	let li15;
    	let t34;
    	let li16;
    	let t36;
    	let li17;
    	let t38;
    	let li18;
    	let t40;
    	let li19;
    	let t42;
    	let li20;
    	let t44;
    	let li26;
    	let t45;
    	let ul3;
    	let li22;
    	let t47;
    	let li23;
    	let t49;
    	let li24;
    	let t51;
    	let li25;

    	const block = {
    		c: function create() {
    			h3 = element("h3");
    			h3.textContent = "페트리 연동하기[iOS]";
    			t1 = space();
    			div = element("div");
    			div.textContent = "이벤트 분석";
    			t3 = space();
    			ul4 = element("ul");
    			li3 = element("li");
    			t4 = text("유저 분석\r\n        ");
    			ul0 = element("ul");
    			li0 = element("li");
    			li0.textContent = "로그인/로그아웃 이벤트";
    			t6 = space();
    			li1 = element("li");
    			li1.textContent = "유저 정보";
    			t8 = space();
    			li2 = element("li");
    			li2.textContent = "위치 정보";
    			t10 = space();
    			li4 = element("li");
    			li4.textContent = "커스텀 분석";
    			t12 = space();
    			li10 = element("li");
    			t13 = text("공통(일반) 분석\r\n        ");
    			ul1 = element("ul");
    			li5 = element("li");
    			li5.textContent = "회원가입";
    			t15 = space();
    			li6 = element("li");
    			li6.textContent = "앱 업데이트";
    			t17 = space();
    			li7 = element("li");
    			li7.textContent = "사용자 초대";
    			t19 = space();
    			li8 = element("li");
    			li8.textContent = "크레딧 사용";
    			t21 = space();
    			li9 = element("li");
    			li9.textContent = "구매하기";
    			t23 = space();
    			li21 = element("li");
    			t24 = text("커머스 분석\r\n        ");
    			ul2 = element("ul");
    			li11 = element("li");
    			li11.textContent = "상품상세보기";
    			t26 = space();
    			li12 = element("li");
    			li12.textContent = "장바구니담기";
    			t28 = space();
    			li13 = element("li");
    			li13.textContent = "관심상품추가";
    			t30 = space();
    			li14 = element("li");
    			li14.textContent = "주문확인하기";
    			t32 = space();
    			li15 = element("li");
    			li15.textContent = "주문취소하기";
    			t34 = space();
    			li16 = element("li");
    			li16.textContent = "상품검색하기";
    			t36 = space();
    			li17 = element("li");
    			li17.textContent = "상품공유하기";
    			t38 = space();
    			li18 = element("li");
    			li18.textContent = "상품목록 조회하기";
    			t40 = space();
    			li19 = element("li");
    			li19.textContent = "장바구니 조회하기";
    			t42 = space();
    			li20 = element("li");
    			li20.textContent = "결제 정보 입력하기";
    			t44 = space();
    			li26 = element("li");
    			t45 = text("게임 분석\r\n        ");
    			ul3 = element("ul");
    			li22 = element("li");
    			li22.textContent = "튜토리얼 완료";
    			t47 = space();
    			li23 = element("li");
    			li23.textContent = "캐릭터 생성";
    			t49 = space();
    			li24 = element("li");
    			li24.textContent = "스테이지 완료";
    			t51 = space();
    			li25 = element("li");
    			li25.textContent = "레벨 달성";
    			attr_dev(h3, "class", "head-text");
    			add_location(h3, file$1, 3, 0, 27);
    			attr_dev(div, "class", "title");
    			add_location(div, file$1, 4, 0, 69);
    			add_location(li0, file$1, 11, 12, 163);
    			add_location(li1, file$1, 12, 12, 198);
    			add_location(li2, file$1, 13, 12, 226);
    			add_location(ul0, file$1, 10, 8, 145);
    			add_location(li3, file$1, 8, 4, 116);
    			add_location(li4, file$1, 16, 4, 272);
    			add_location(li5, file$1, 20, 12, 344);
    			add_location(li6, file$1, 21, 12, 371);
    			add_location(li7, file$1, 22, 12, 400);
    			add_location(li8, file$1, 23, 12, 429);
    			add_location(li9, file$1, 24, 12, 458);
    			add_location(ul1, file$1, 19, 8, 326);
    			add_location(li10, file$1, 17, 4, 293);
    			add_location(li11, file$1, 30, 12, 551);
    			add_location(li12, file$1, 31, 12, 580);
    			add_location(li13, file$1, 32, 12, 609);
    			add_location(li14, file$1, 33, 12, 638);
    			add_location(li15, file$1, 34, 12, 667);
    			add_location(li16, file$1, 35, 12, 696);
    			add_location(li17, file$1, 36, 12, 725);
    			add_location(li18, file$1, 37, 12, 754);
    			add_location(li19, file$1, 38, 12, 786);
    			add_location(li20, file$1, 39, 12, 818);
    			add_location(ul2, file$1, 29, 8, 533);
    			add_location(li21, file$1, 27, 4, 503);
    			add_location(li22, file$1, 45, 12, 916);
    			add_location(li23, file$1, 46, 12, 946);
    			add_location(li24, file$1, 47, 12, 975);
    			add_location(li25, file$1, 48, 12, 1005);
    			add_location(ul3, file$1, 44, 8, 898);
    			add_location(li26, file$1, 42, 4, 869);
    			add_location(ul4, file$1, 7, 0, 106);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h3, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, div, anchor);
    			insert_dev(target, t3, anchor);
    			insert_dev(target, ul4, anchor);
    			append_dev(ul4, li3);
    			append_dev(li3, t4);
    			append_dev(li3, ul0);
    			append_dev(ul0, li0);
    			append_dev(ul0, t6);
    			append_dev(ul0, li1);
    			append_dev(ul0, t8);
    			append_dev(ul0, li2);
    			append_dev(ul4, t10);
    			append_dev(ul4, li4);
    			append_dev(ul4, t12);
    			append_dev(ul4, li10);
    			append_dev(li10, t13);
    			append_dev(li10, ul1);
    			append_dev(ul1, li5);
    			append_dev(ul1, t15);
    			append_dev(ul1, li6);
    			append_dev(ul1, t17);
    			append_dev(ul1, li7);
    			append_dev(ul1, t19);
    			append_dev(ul1, li8);
    			append_dev(ul1, t21);
    			append_dev(ul1, li9);
    			append_dev(ul4, t23);
    			append_dev(ul4, li21);
    			append_dev(li21, t24);
    			append_dev(li21, ul2);
    			append_dev(ul2, li11);
    			append_dev(ul2, t26);
    			append_dev(ul2, li12);
    			append_dev(ul2, t28);
    			append_dev(ul2, li13);
    			append_dev(ul2, t30);
    			append_dev(ul2, li14);
    			append_dev(ul2, t32);
    			append_dev(ul2, li15);
    			append_dev(ul2, t34);
    			append_dev(ul2, li16);
    			append_dev(ul2, t36);
    			append_dev(ul2, li17);
    			append_dev(ul2, t38);
    			append_dev(ul2, li18);
    			append_dev(ul2, t40);
    			append_dev(ul2, li19);
    			append_dev(ul2, t42);
    			append_dev(ul2, li20);
    			append_dev(ul4, t44);
    			append_dev(ul4, li26);
    			append_dev(li26, t45);
    			append_dev(li26, ul3);
    			append_dev(ul3, li22);
    			append_dev(ul3, t47);
    			append_dev(ul3, li23);
    			append_dev(ul3, t49);
    			append_dev(ul3, li24);
    			append_dev(ul3, t51);
    			append_dev(ul3, li25);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h3);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(div);
    			if (detaching) detach_dev(t3);
    			if (detaching) detach_dev(ul4);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Page3', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Page3> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class Page3 extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Page3",
    			options,
    			id: create_fragment$1.name
    		});
    	}
    }

    /* src/App.svelte generated by Svelte v3.50.0 */
    const file = "src/App.svelte";

    // (25:2) <Router>
    function create_default_slot_13(ctx) {
    	let ul9;
    	let li5;
    	let a0;
    	let ul0;
    	let i0;
    	let t0;
    	let t1;
    	let a1;
    	let ul1;
    	let i1;
    	let t2;
    	let t3;
    	let a2;
    	let ul2;
    	let i2;
    	let t4;
    	let t5;
    	let a3;
    	let ul3;
    	let i3;
    	let t6;
    	let t7;
    	let a4;
    	let ul4;
    	let i4;
    	let t8;
    	let t9;
    	let a5;
    	let ul5;
    	let i5;
    	let t10;
    	let t11;
    	let a6;
    	let ul6;
    	let i6;
    	let t12;
    	let t13;
    	let ul8;
    	let i7;
    	let t14;
    	let li0;
    	let t16;
    	let ul7;
    	let a7;
    	let li1;
    	let t18;
    	let a8;
    	let li2;
    	let t20;
    	let a9;
    	let li3;
    	let t22;
    	let a10;
    	let li4;

    	const block = {
    		c: function create() {
    			ul9 = element("ul");
    			li5 = element("li");
    			a0 = element("a");
    			ul0 = element("ul");
    			i0 = element("i");
    			t0 = text("대시보드");
    			t1 = space();
    			a1 = element("a");
    			ul1 = element("ul");
    			i1 = element("i");
    			t2 = text("광고 파트너");
    			t3 = space();
    			a2 = element("a");
    			ul2 = element("ul");
    			i2 = element("i");
    			t4 = text("캠페인");
    			t5 = space();
    			a3 = element("a");
    			ul3 = element("ul");
    			i3 = element("i");
    			t6 = text("랜딩 설정");
    			t7 = space();
    			a4 = element("a");
    			ul4 = element("ul");
    			i4 = element("i");
    			t8 = text("트래킹 링크");
    			t9 = space();
    			a5 = element("a");
    			ul5 = element("ul");
    			i5 = element("i");
    			t10 = text("프로드 방지");
    			t11 = space();
    			a6 = element("a");
    			ul6 = element("ul");
    			i6 = element("i");
    			t12 = text("측정 모델");
    			t13 = space();
    			ul8 = element("ul");
    			i7 = element("i");
    			t14 = text("SDK 연동 가이드 \n\t\t\t\t\t\t");
    			li0 = element("li");
    			li0.textContent = "iOS SDK";
    			t16 = space();
    			ul7 = element("ul");
    			a7 = element("a");
    			li1 = element("li");
    			li1.textContent = "페트리 초기화";
    			t18 = space();
    			a8 = element("a");
    			li2 = element("li");
    			li2.textContent = "딥 링크 이벤트 분석";
    			t20 = space();
    			a9 = element("a");
    			li3 = element("li");
    			li3.textContent = "이벤트 분석";
    			t22 = space();
    			a10 = element("a");
    			li4 = element("li");
    			li4.textContent = "Android SDK";
    			attr_dev(i0, "class", "bi bi-clipboard-data nav-icon svelte-kuwc8u");
    			add_location(i0, file, 27, 51, 1060);
    			attr_dev(ul0, "class", "nav-link-li");
    			add_location(ul0, file, 27, 27, 1036);
    			attr_dev(a0, "href", "/dashboard");
    			add_location(a0, file, 27, 5, 1014);
    			attr_dev(i1, "class", "bi bi-person nav-icon svelte-kuwc8u");
    			add_location(i1, file, 28, 49, 1168);
    			attr_dev(ul1, "class", "nav-link-li");
    			add_location(ul1, file, 28, 25, 1144);
    			attr_dev(a1, "href", "/partner");
    			add_location(a1, file, 28, 5, 1124);
    			attr_dev(i2, "class", "bi bi-globe nav-icon svelte-kuwc8u");
    			add_location(i2, file, 29, 50, 1271);
    			attr_dev(ul2, "class", "nav-link-li");
    			add_location(ul2, file, 29, 26, 1247);
    			attr_dev(a2, "href", "/campaign");
    			add_location(a2, file, 29, 5, 1226);
    			attr_dev(i3, "class", "bi bi-gear nav-icon svelte-kuwc8u");
    			add_location(i3, file, 30, 49, 1369);
    			attr_dev(ul3, "class", "nav-link-li");
    			add_location(ul3, file, 30, 25, 1345);
    			attr_dev(a3, "href", "/landing");
    			add_location(a3, file, 30, 5, 1325);
    			attr_dev(i4, "class", "bi bi-share nav-icon svelte-kuwc8u");
    			add_location(i4, file, 31, 50, 1469);
    			attr_dev(ul4, "class", "nav-link-li");
    			add_location(ul4, file, 31, 26, 1445);
    			attr_dev(a4, "href", "/tracking");
    			add_location(a4, file, 31, 5, 1424);
    			attr_dev(i5, "class", "bi bi-emoji-smile-fill nav-icon svelte-kuwc8u");
    			add_location(i5, file, 32, 47, 1568);
    			attr_dev(ul5, "class", "nav-link-li");
    			add_location(ul5, file, 32, 23, 1544);
    			attr_dev(a5, "href", "/fraud");
    			add_location(a5, file, 32, 5, 1526);
    			attr_dev(i6, "class", "bi bi-bar-chart nav-icon svelte-kuwc8u");
    			add_location(i6, file, 33, 46, 1677);
    			attr_dev(ul6, "class", "nav-link-li");
    			add_location(ul6, file, 33, 22, 1653);
    			attr_dev(a6, "href", "/attr");
    			add_location(a6, file, 33, 5, 1636);
    			attr_dev(i7, "class", "bi bi-gear nav-icon svelte-kuwc8u");
    			add_location(i7, file, 35, 6, 1769);
    			attr_dev(li0, "class", "sdk svelte-kuwc8u");
    			add_location(li0, file, 36, 6, 1822);
    			add_location(li1, file, 38, 30, 1904);
    			attr_dev(a7, "href", "/sdkguide1p1");
    			add_location(a7, file, 38, 7, 1881);
    			add_location(li2, file, 39, 30, 1955);
    			attr_dev(a8, "href", "/sdkguide1p2");
    			add_location(a8, file, 39, 7, 1932);
    			add_location(li3, file, 40, 30, 2010);
    			attr_dev(a9, "href", "/sdkguide1p3");
    			add_location(a9, file, 40, 7, 1987);
    			attr_dev(ul7, "class", "sdk");
    			add_location(ul7, file, 37, 6, 1857);
    			attr_dev(li4, "class", "sdk svelte-kuwc8u");
    			add_location(li4, file, 42, 28, 2070);
    			attr_dev(a10, "href", "/sdkguide2");
    			add_location(a10, file, 42, 6, 2048);
    			attr_dev(ul8, "class", "nav-link-li");
    			add_location(ul8, file, 34, 5, 1738);
    			add_location(li5, file, 26, 4, 1004);
    			attr_dev(ul9, "class", "nav-no-bullets svelte-kuwc8u");
    			add_location(ul9, file, 25, 3, 972);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, ul9, anchor);
    			append_dev(ul9, li5);
    			append_dev(li5, a0);
    			append_dev(a0, ul0);
    			append_dev(ul0, i0);
    			append_dev(ul0, t0);
    			append_dev(li5, t1);
    			append_dev(li5, a1);
    			append_dev(a1, ul1);
    			append_dev(ul1, i1);
    			append_dev(ul1, t2);
    			append_dev(li5, t3);
    			append_dev(li5, a2);
    			append_dev(a2, ul2);
    			append_dev(ul2, i2);
    			append_dev(ul2, t4);
    			append_dev(li5, t5);
    			append_dev(li5, a3);
    			append_dev(a3, ul3);
    			append_dev(ul3, i3);
    			append_dev(ul3, t6);
    			append_dev(li5, t7);
    			append_dev(li5, a4);
    			append_dev(a4, ul4);
    			append_dev(ul4, i4);
    			append_dev(ul4, t8);
    			append_dev(li5, t9);
    			append_dev(li5, a5);
    			append_dev(a5, ul5);
    			append_dev(ul5, i5);
    			append_dev(ul5, t10);
    			append_dev(li5, t11);
    			append_dev(li5, a6);
    			append_dev(a6, ul6);
    			append_dev(ul6, i6);
    			append_dev(ul6, t12);
    			append_dev(li5, t13);
    			append_dev(li5, ul8);
    			append_dev(ul8, i7);
    			append_dev(ul8, t14);
    			append_dev(ul8, li0);
    			append_dev(ul8, t16);
    			append_dev(ul8, ul7);
    			append_dev(ul7, a7);
    			append_dev(a7, li1);
    			append_dev(ul7, t18);
    			append_dev(ul7, a8);
    			append_dev(a8, li2);
    			append_dev(ul7, t20);
    			append_dev(ul7, a9);
    			append_dev(a9, li3);
    			append_dev(ul8, t22);
    			append_dev(ul8, a10);
    			append_dev(a10, li4);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(ul9);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_13.name,
    		type: "slot",
    		source: "(25:2) <Router>",
    		ctx
    	});

    	return block;
    }

    // (56:4) <Route path="/dashboard" primary={false}>
    function create_default_slot_12(ctx) {
    	let dashboard;
    	let current;
    	dashboard = new Dashboard({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(dashboard.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(dashboard, target, anchor);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(dashboard.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(dashboard.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(dashboard, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_12.name,
    		type: "slot",
    		source: "(56:4) <Route path=\\\"/dashboard\\\" primary={false}>",
    		ctx
    	});

    	return block;
    }

    // (61:4) <Route path="/tracking" primary={false}>
    function create_default_slot_11(ctx) {
    	let tracking;
    	let current;
    	tracking = new Tracking({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(tracking.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(tracking, target, anchor);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(tracking.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(tracking.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(tracking, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_11.name,
    		type: "slot",
    		source: "(61:4) <Route path=\\\"/tracking\\\" primary={false}>",
    		ctx
    	});

    	return block;
    }

    // (66:4) <Route path="/landing" primary={false}>
    function create_default_slot_10(ctx) {
    	let landing;
    	let current;
    	landing = new Landing({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(landing.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(landing, target, anchor);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(landing.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(landing.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(landing, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_10.name,
    		type: "slot",
    		source: "(66:4) <Route path=\\\"/landing\\\" primary={false}>",
    		ctx
    	});

    	return block;
    }

    // (71:4) <Route path="/campaign" primary={false}>
    function create_default_slot_9(ctx) {
    	let campaign;
    	let current;
    	campaign = new Campaign({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(campaign.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(campaign, target, anchor);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(campaign.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(campaign.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(campaign, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_9.name,
    		type: "slot",
    		source: "(71:4) <Route path=\\\"/campaign\\\" primary={false}>",
    		ctx
    	});

    	return block;
    }

    // (76:4) <Route path="/campaign-info" primary={false}>
    function create_default_slot_8(ctx) {
    	let campaigninfo;
    	let current;
    	campaigninfo = new CampaignInfo({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(campaigninfo.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(campaigninfo, target, anchor);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(campaigninfo.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(campaigninfo.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(campaigninfo, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_8.name,
    		type: "slot",
    		source: "(76:4) <Route path=\\\"/campaign-info\\\" primary={false}>",
    		ctx
    	});

    	return block;
    }

    // (81:4) <Route path="/fraud" primary={false}>
    function create_default_slot_7(ctx) {
    	let fraud;
    	let current;
    	fraud = new Fraud({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(fraud.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(fraud, target, anchor);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(fraud.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(fraud.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(fraud, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_7.name,
    		type: "slot",
    		source: "(81:4) <Route path=\\\"/fraud\\\" primary={false}>",
    		ctx
    	});

    	return block;
    }

    // (86:4) <Route path="/attr" primary={false}>
    function create_default_slot_6(ctx) {
    	let attr_1;
    	let current;
    	attr_1 = new Attr({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(attr_1.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(attr_1, target, anchor);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(attr_1.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(attr_1.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(attr_1, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_6.name,
    		type: "slot",
    		source: "(86:4) <Route path=\\\"/attr\\\" primary={false}>",
    		ctx
    	});

    	return block;
    }

    // (91:4) <Route path="/partner" primary={false}>
    function create_default_slot_5(ctx) {
    	let partner;
    	let current;
    	partner = new Partner({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(partner.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(partner, target, anchor);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(partner.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(partner.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(partner, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_5.name,
    		type: "slot",
    		source: "(91:4) <Route path=\\\"/partner\\\" primary={false}>",
    		ctx
    	});

    	return block;
    }

    // (98:4) <Route path="/sdkguide2" primary={false}>
    function create_default_slot_4(ctx) {
    	let sdkguide2;
    	let current;
    	sdkguide2 = new SDKGuide2({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(sdkguide2.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(sdkguide2, target, anchor);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(sdkguide2.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(sdkguide2.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(sdkguide2, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_4.name,
    		type: "slot",
    		source: "(98:4) <Route path=\\\"/sdkguide2\\\" primary={false}>",
    		ctx
    	});

    	return block;
    }

    // (103:4) <Route path="/sdkguide1p1" primary={false}>
    function create_default_slot_3(ctx) {
    	let sdkguide1p1;
    	let current;
    	sdkguide1p1 = new Page1({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(sdkguide1p1.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(sdkguide1p1, target, anchor);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(sdkguide1p1.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(sdkguide1p1.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(sdkguide1p1, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_3.name,
    		type: "slot",
    		source: "(103:4) <Route path=\\\"/sdkguide1p1\\\" primary={false}>",
    		ctx
    	});

    	return block;
    }

    // (108:4) <Route path="/sdkguide1p2" primary={false}>
    function create_default_slot_2(ctx) {
    	let sdkguide1p2;
    	let current;
    	sdkguide1p2 = new Page2({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(sdkguide1p2.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(sdkguide1p2, target, anchor);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(sdkguide1p2.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(sdkguide1p2.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(sdkguide1p2, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_2.name,
    		type: "slot",
    		source: "(108:4) <Route path=\\\"/sdkguide1p2\\\" primary={false}>",
    		ctx
    	});

    	return block;
    }

    // (113:4) <Route path="/sdkguide1p3" primary={false}>
    function create_default_slot_1(ctx) {
    	let sdkguide1p3;
    	let current;
    	sdkguide1p3 = new Page3({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(sdkguide1p3.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(sdkguide1p3, target, anchor);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(sdkguide1p3.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(sdkguide1p3.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(sdkguide1p3, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_1.name,
    		type: "slot",
    		source: "(113:4) <Route path=\\\"/sdkguide1p3\\\" primary={false}>",
    		ctx
    	});

    	return block;
    }

    // (54:3) <Router>
    function create_default_slot(ctx) {
    	let route0;
    	let t0;
    	let route1;
    	let t1;
    	let route2;
    	let t2;
    	let route3;
    	let t3;
    	let route4;
    	let t4;
    	let route5;
    	let t5;
    	let route6;
    	let t6;
    	let route7;
    	let t7;
    	let route8;
    	let t8;
    	let route9;
    	let t9;
    	let route10;
    	let t10;
    	let route11;
    	let current;

    	route0 = new Route$1({
    			props: {
    				path: "/dashboard",
    				primary: false,
    				$$slots: { default: [create_default_slot_12] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	route1 = new Route$1({
    			props: {
    				path: "/tracking",
    				primary: false,
    				$$slots: { default: [create_default_slot_11] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	route2 = new Route$1({
    			props: {
    				path: "/landing",
    				primary: false,
    				$$slots: { default: [create_default_slot_10] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	route3 = new Route$1({
    			props: {
    				path: "/campaign",
    				primary: false,
    				$$slots: { default: [create_default_slot_9] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	route4 = new Route$1({
    			props: {
    				path: "/campaign-info",
    				primary: false,
    				$$slots: { default: [create_default_slot_8] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	route5 = new Route$1({
    			props: {
    				path: "/fraud",
    				primary: false,
    				$$slots: { default: [create_default_slot_7] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	route6 = new Route$1({
    			props: {
    				path: "/attr",
    				primary: false,
    				$$slots: { default: [create_default_slot_6] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	route7 = new Route$1({
    			props: {
    				path: "/partner",
    				primary: false,
    				$$slots: { default: [create_default_slot_5] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	route8 = new Route$1({
    			props: {
    				path: "/sdkguide2",
    				primary: false,
    				$$slots: { default: [create_default_slot_4] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	route9 = new Route$1({
    			props: {
    				path: "/sdkguide1p1",
    				primary: false,
    				$$slots: { default: [create_default_slot_3] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	route10 = new Route$1({
    			props: {
    				path: "/sdkguide1p2",
    				primary: false,
    				$$slots: { default: [create_default_slot_2] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	route11 = new Route$1({
    			props: {
    				path: "/sdkguide1p3",
    				primary: false,
    				$$slots: { default: [create_default_slot_1] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(route0.$$.fragment);
    			t0 = space();
    			create_component(route1.$$.fragment);
    			t1 = space();
    			create_component(route2.$$.fragment);
    			t2 = space();
    			create_component(route3.$$.fragment);
    			t3 = space();
    			create_component(route4.$$.fragment);
    			t4 = space();
    			create_component(route5.$$.fragment);
    			t5 = space();
    			create_component(route6.$$.fragment);
    			t6 = space();
    			create_component(route7.$$.fragment);
    			t7 = space();
    			create_component(route8.$$.fragment);
    			t8 = space();
    			create_component(route9.$$.fragment);
    			t9 = space();
    			create_component(route10.$$.fragment);
    			t10 = space();
    			create_component(route11.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(route0, target, anchor);
    			insert_dev(target, t0, anchor);
    			mount_component(route1, target, anchor);
    			insert_dev(target, t1, anchor);
    			mount_component(route2, target, anchor);
    			insert_dev(target, t2, anchor);
    			mount_component(route3, target, anchor);
    			insert_dev(target, t3, anchor);
    			mount_component(route4, target, anchor);
    			insert_dev(target, t4, anchor);
    			mount_component(route5, target, anchor);
    			insert_dev(target, t5, anchor);
    			mount_component(route6, target, anchor);
    			insert_dev(target, t6, anchor);
    			mount_component(route7, target, anchor);
    			insert_dev(target, t7, anchor);
    			mount_component(route8, target, anchor);
    			insert_dev(target, t8, anchor);
    			mount_component(route9, target, anchor);
    			insert_dev(target, t9, anchor);
    			mount_component(route10, target, anchor);
    			insert_dev(target, t10, anchor);
    			mount_component(route11, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const route0_changes = {};

    			if (dirty & /*$$scope*/ 1) {
    				route0_changes.$$scope = { dirty, ctx };
    			}

    			route0.$set(route0_changes);
    			const route1_changes = {};

    			if (dirty & /*$$scope*/ 1) {
    				route1_changes.$$scope = { dirty, ctx };
    			}

    			route1.$set(route1_changes);
    			const route2_changes = {};

    			if (dirty & /*$$scope*/ 1) {
    				route2_changes.$$scope = { dirty, ctx };
    			}

    			route2.$set(route2_changes);
    			const route3_changes = {};

    			if (dirty & /*$$scope*/ 1) {
    				route3_changes.$$scope = { dirty, ctx };
    			}

    			route3.$set(route3_changes);
    			const route4_changes = {};

    			if (dirty & /*$$scope*/ 1) {
    				route4_changes.$$scope = { dirty, ctx };
    			}

    			route4.$set(route4_changes);
    			const route5_changes = {};

    			if (dirty & /*$$scope*/ 1) {
    				route5_changes.$$scope = { dirty, ctx };
    			}

    			route5.$set(route5_changes);
    			const route6_changes = {};

    			if (dirty & /*$$scope*/ 1) {
    				route6_changes.$$scope = { dirty, ctx };
    			}

    			route6.$set(route6_changes);
    			const route7_changes = {};

    			if (dirty & /*$$scope*/ 1) {
    				route7_changes.$$scope = { dirty, ctx };
    			}

    			route7.$set(route7_changes);
    			const route8_changes = {};

    			if (dirty & /*$$scope*/ 1) {
    				route8_changes.$$scope = { dirty, ctx };
    			}

    			route8.$set(route8_changes);
    			const route9_changes = {};

    			if (dirty & /*$$scope*/ 1) {
    				route9_changes.$$scope = { dirty, ctx };
    			}

    			route9.$set(route9_changes);
    			const route10_changes = {};

    			if (dirty & /*$$scope*/ 1) {
    				route10_changes.$$scope = { dirty, ctx };
    			}

    			route10.$set(route10_changes);
    			const route11_changes = {};

    			if (dirty & /*$$scope*/ 1) {
    				route11_changes.$$scope = { dirty, ctx };
    			}

    			route11.$set(route11_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(route0.$$.fragment, local);
    			transition_in(route1.$$.fragment, local);
    			transition_in(route2.$$.fragment, local);
    			transition_in(route3.$$.fragment, local);
    			transition_in(route4.$$.fragment, local);
    			transition_in(route5.$$.fragment, local);
    			transition_in(route6.$$.fragment, local);
    			transition_in(route7.$$.fragment, local);
    			transition_in(route8.$$.fragment, local);
    			transition_in(route9.$$.fragment, local);
    			transition_in(route10.$$.fragment, local);
    			transition_in(route11.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(route0.$$.fragment, local);
    			transition_out(route1.$$.fragment, local);
    			transition_out(route2.$$.fragment, local);
    			transition_out(route3.$$.fragment, local);
    			transition_out(route4.$$.fragment, local);
    			transition_out(route5.$$.fragment, local);
    			transition_out(route6.$$.fragment, local);
    			transition_out(route7.$$.fragment, local);
    			transition_out(route8.$$.fragment, local);
    			transition_out(route9.$$.fragment, local);
    			transition_out(route10.$$.fragment, local);
    			transition_out(route11.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(route0, detaching);
    			if (detaching) detach_dev(t0);
    			destroy_component(route1, detaching);
    			if (detaching) detach_dev(t1);
    			destroy_component(route2, detaching);
    			if (detaching) detach_dev(t2);
    			destroy_component(route3, detaching);
    			if (detaching) detach_dev(t3);
    			destroy_component(route4, detaching);
    			if (detaching) detach_dev(t4);
    			destroy_component(route5, detaching);
    			if (detaching) detach_dev(t5);
    			destroy_component(route6, detaching);
    			if (detaching) detach_dev(t6);
    			destroy_component(route7, detaching);
    			if (detaching) detach_dev(t7);
    			destroy_component(route8, detaching);
    			if (detaching) detach_dev(t8);
    			destroy_component(route9, detaching);
    			if (detaching) detach_dev(t9);
    			destroy_component(route10, detaching);
    			if (detaching) detach_dev(t10);
    			destroy_component(route11, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot.name,
    		type: "slot",
    		source: "(54:3) <Router>",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let main;
    	let div0;
    	let span;
    	let t1;
    	let div4;
    	let div3;
    	let a;
    	let div1;
    	let t3;
    	let div2;
    	let t5;
    	let router0;
    	let t6;
    	let div6;
    	let div5;
    	let router1;
    	let current;

    	router0 = new Router$1({
    			props: {
    				$$slots: { default: [create_default_slot_13] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	router1 = new Router$1({
    			props: {
    				$$slots: { default: [create_default_slot] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			main = element("main");
    			div0 = element("div");
    			span = element("span");
    			span.textContent = "메뉴 펼치기";
    			t1 = space();
    			div4 = element("div");
    			div3 = element("div");
    			a = element("a");
    			div1 = element("div");
    			div1.textContent = "로그아웃";
    			t3 = space();
    			div2 = element("div");
    			div2.textContent = "메뉴닫기";
    			t5 = space();
    			create_component(router0.$$.fragment);
    			t6 = space();
    			div6 = element("div");
    			div5 = element("div");
    			create_component(router1.$$.fragment);
    			attr_dev(span, "class", "nav-open-menu svelte-kuwc8u");
    			attr_dev(span, "id", "open-menu");
    			attr_dev(span, "onclick", "openMenu()");
    			add_location(span, file, 17, 23, 677);
    			attr_dev(div0, "class", "top-cont svelte-kuwc8u");
    			add_location(div0, file, 17, 1, 655);
    			attr_dev(div1, "class", "nav-logout svelte-kuwc8u");
    			add_location(div1, file, 20, 27, 846);
    			attr_dev(a, "href", "../index.html");
    			add_location(a, file, 20, 3, 822);
    			attr_dev(div2, "class", "nav-close-out svelte-kuwc8u");
    			attr_dev(div2, "onclick", "closeMenu()");
    			add_location(div2, file, 21, 3, 888);
    			attr_dev(div3, "class", "top-nav svelte-kuwc8u");
    			add_location(div3, file, 19, 2, 797);
    			attr_dev(div4, "class", "nav svelte-kuwc8u");
    			attr_dev(div4, "id", "left-menu");
    			add_location(div4, file, 18, 1, 762);
    			attr_dev(div5, "class", "mid-cont svelte-kuwc8u");
    			add_location(div5, file, 52, 2, 2195);
    			attr_dev(div6, "class", "cont svelte-kuwc8u");
    			attr_dev(div6, "id", "main");
    			add_location(div6, file, 49, 1, 2160);
    			attr_dev(main, "class", "svelte-kuwc8u");
    			add_location(main, file, 16, 0, 647);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			append_dev(main, div0);
    			append_dev(div0, span);
    			append_dev(main, t1);
    			append_dev(main, div4);
    			append_dev(div4, div3);
    			append_dev(div3, a);
    			append_dev(a, div1);
    			append_dev(div3, t3);
    			append_dev(div3, div2);
    			append_dev(div4, t5);
    			mount_component(router0, div4, null);
    			append_dev(main, t6);
    			append_dev(main, div6);
    			append_dev(div6, div5);
    			mount_component(router1, div5, null);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			const router0_changes = {};

    			if (dirty & /*$$scope*/ 1) {
    				router0_changes.$$scope = { dirty, ctx };
    			}

    			router0.$set(router0_changes);
    			const router1_changes = {};

    			if (dirty & /*$$scope*/ 1) {
    				router1_changes.$$scope = { dirty, ctx };
    			}

    			router1.$set(router1_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(router0.$$.fragment, local);
    			transition_in(router1.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(router0.$$.fragment, local);
    			transition_out(router1.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			destroy_component(router0);
    			destroy_component(router1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('App', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({
    		Router: Router$1,
    		Route: Route$1,
    		Dashboard,
    		Landing,
    		Campaign,
    		CampaignInfo,
    		Partner,
    		Fraud,
    		Tracking,
    		Attr,
    		SDKGuide2,
    		SDKGuide1P1: Page1,
    		SDKGuide1P2: Page2,
    		SDKGuide1P3: Page3
    	});

    	return [];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    const app = new App({
    	target: document.body
    });

    return app;

})();
//# sourceMappingURL=bundle.js.map
