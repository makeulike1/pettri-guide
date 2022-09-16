
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35731/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
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

    const file$h = "node_modules/svelte-navigator/src/Router.svelte";

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
    			add_location(div, file$h, 195, 1, 5906);
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

    function create_fragment$i(ctx) {
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
    			add_location(div, file$h, 190, 0, 5750);
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
    		id: create_fragment$i.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    const createId$1 = createCounter();
    const defaultBasepath = "/";

    function instance$i($$self, $$props, $$invalidate) {
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
    			instance$i,
    			create_fragment$i,
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
    			id: create_fragment$i.name
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
    const file$g = "node_modules/svelte-navigator/src/Route.svelte";

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

    function create_fragment$h(ctx) {
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
    			add_location(div0, file$g, 95, 0, 2622);
    			set_style(div1, "display", "none");
    			attr_dev(div1, "aria-hidden", "true");
    			attr_dev(div1, "data-svnav-route-end", /*id*/ ctx[5]);
    			add_location(div1, file$g, 121, 0, 3295);
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
    		id: create_fragment$h.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    const createId = createCounter();

    function instance$h($$self, $$props, $$invalidate) {
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

    		init(this, options, instance$h, create_fragment$h, safe_not_equal, {
    			path: 12,
    			component: 0,
    			meta: 13,
    			primary: 1
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Route",
    			options,
    			id: create_fragment$h.name
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

    /* src/SDKGuide2.svelte generated by Svelte v3.50.0 */

    function create_fragment$g(ctx) {
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
    		id: create_fragment$g.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$g($$self, $$props) {
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
    		init(this, options, instance$g, create_fragment$g, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "SDKGuide2",
    			options,
    			id: create_fragment$g.name
    		});
    	}
    }

    /* src/ios-sdk/code1.svelte generated by Svelte v3.50.0 */

    const file$f = "src/ios-sdk/code1.svelte";

    function create_fragment$f(ctx) {
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
    			add_location(div0, file$f, 5, 4, 93);
    			add_location(br0, file$f, 6, 4, 135);
    			attr_dev(div1, "class", "line");
    			add_location(div1, file$f, 7, 4, 144);
    			add_location(br1, file$f, 8, 4, 324);
    			attr_dev(div2, "class", "remark left-space");
    			add_location(div2, file$f, 9, 4, 333);
    			attr_dev(div3, "class", "line left-space");
    			add_location(div3, file$f, 10, 4, 392);
    			add_location(br2, file$f, 11, 4, 463);
    			attr_dev(div4, "class", "remark left-space");
    			add_location(div4, file$f, 12, 4, 472);
    			attr_dev(div5, "class", "line left-space");
    			add_location(div5, file$f, 13, 4, 545);
    			add_location(br3, file$f, 16, 4, 653);
    			attr_dev(div6, "class", "remark left-space");
    			add_location(div6, file$f, 17, 4, 662);
    			attr_dev(div7, "class", "line left-space");
    			add_location(div7, file$f, 18, 4, 723);
    			add_location(br4, file$f, 21, 4, 788);
    			attr_dev(div8, "class", "line left-space");
    			add_location(div8, file$f, 22, 4, 797);
    			add_location(br5, file$f, 23, 4, 848);
    			attr_dev(div9, "class", "code");
    			add_location(div9, file$f, 4, 0, 70);
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
    		id: create_fragment$f.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$f($$self, $$props, $$invalidate) {
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
    		init(this, options, instance$f, create_fragment$f, safe_not_equal, { leftbrace: 0, rightbrace: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Code1",
    			options,
    			id: create_fragment$f.name
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

    /* src/ios-sdk/code2.svelte generated by Svelte v3.50.0 */

    const file$e = "src/ios-sdk/code2.svelte";

    function create_fragment$e(ctx) {
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
    			div8.textContent = "// 이벤트 개수를 기준으로 페트리에 전송합니다.";
    			t23 = space();
    			div9 = element("div");
    			div9.textContent = "pettri.setUploadMetric(Pettri.UploadMetric.Event)";
    			t25 = space();
    			br5 = element("br");
    			t26 = space();
    			div10 = element("div");
    			div10.textContent = "// 기준에 해당하는 개수가 되면 패트리로 전송이 됩니다. 5번 이벤트가 발생되었을 경우 페트리에 전송됩니다.";
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
    			add_location(div0, file$e, 5, 4, 93);
    			add_location(br0, file$e, 6, 4, 135);
    			attr_dev(div1, "class", "line");
    			add_location(div1, file$e, 7, 4, 144);
    			add_location(br1, file$e, 8, 4, 324);
    			attr_dev(div2, "class", "remark left-space");
    			add_location(div2, file$e, 9, 4, 333);
    			attr_dev(div3, "class", "line left-space");
    			add_location(div3, file$e, 10, 4, 392);
    			add_location(br2, file$e, 11, 4, 463);
    			attr_dev(div4, "class", "remark left-space");
    			add_location(div4, file$e, 12, 4, 472);
    			attr_dev(div5, "class", "line left-space");
    			add_location(div5, file$e, 13, 4, 545);
    			add_location(br3, file$e, 16, 4, 653);
    			attr_dev(div6, "class", "remark left-space");
    			add_location(div6, file$e, 17, 4, 662);
    			attr_dev(div7, "class", "line left-space");
    			add_location(div7, file$e, 18, 4, 723);
    			add_location(br4, file$e, 21, 4, 788);
    			attr_dev(div8, "class", "remark left-space");
    			add_location(div8, file$e, 22, 4, 797);
    			attr_dev(div9, "class", "line left-space");
    			add_location(div9, file$e, 23, 4, 866);
    			add_location(br5, file$e, 26, 4, 969);
    			attr_dev(div10, "class", "remark left-space");
    			add_location(div10, file$e, 27, 4, 978);
    			attr_dev(div11, "class", "line left-space");
    			add_location(div11, file$e, 28, 4, 1081);
    			add_location(br6, file$e, 31, 4, 1160);
    			attr_dev(div12, "class", "line left-space");
    			add_location(div12, file$e, 32, 4, 1169);
    			add_location(br7, file$e, 33, 4, 1220);
    			attr_dev(div13, "class", "code");
    			add_location(div13, file$e, 4, 0, 70);
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
    		id: create_fragment$e.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$e($$self, $$props, $$invalidate) {
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
    		init(this, options, instance$e, create_fragment$e, safe_not_equal, { leftbrace: 0, rightbrace: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Code2",
    			options,
    			id: create_fragment$e.name
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

    /* src/ios-sdk/code3.svelte generated by Svelte v3.50.0 */

    const file$d = "src/ios-sdk/code3.svelte";

    function create_fragment$d(ctx) {
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
    			div9.textContent = "// 이벤트 개수를 기준으로 페트리에 전송합니다.";
    			t25 = space();
    			div10 = element("div");
    			div10.textContent = "pettri.setUploadMetric(Pettri.UploadMetric.Time)";
    			t27 = space();
    			br5 = element("br");
    			t28 = space();
    			div11 = element("div");
    			div11.textContent = "// 기준에 해당하는 개수가 되면 패트리로 전송됩니다. 5초가 경과되었을 경우 페트리에 전송됩니다.";
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
    			add_location(div0, file$d, 5, 0, 71);
    			attr_dev(div1, "class", "line");
    			add_location(div1, file$d, 8, 4, 188);
    			add_location(br0, file$d, 9, 4, 230);
    			attr_dev(div2, "class", "line");
    			add_location(div2, file$d, 10, 4, 239);
    			add_location(br1, file$d, 11, 4, 419);
    			attr_dev(div3, "class", "remark left-space");
    			add_location(div3, file$d, 12, 4, 428);
    			attr_dev(div4, "class", "line left-space");
    			add_location(div4, file$d, 13, 4, 487);
    			add_location(br2, file$d, 14, 4, 558);
    			attr_dev(div5, "class", "remark left-space");
    			add_location(div5, file$d, 15, 4, 567);
    			attr_dev(div6, "class", "line left-space");
    			add_location(div6, file$d, 16, 4, 640);
    			add_location(br3, file$d, 19, 4, 748);
    			attr_dev(div7, "class", "remark left-space");
    			add_location(div7, file$d, 20, 4, 757);
    			attr_dev(div8, "class", "line left-space");
    			add_location(div8, file$d, 21, 4, 818);
    			add_location(br4, file$d, 24, 4, 883);
    			attr_dev(div9, "class", "remark left-space");
    			add_location(div9, file$d, 25, 4, 892);
    			attr_dev(div10, "class", "line left-space");
    			add_location(div10, file$d, 26, 4, 961);
    			add_location(br5, file$d, 29, 4, 1063);
    			attr_dev(div11, "class", "remark left-space");
    			add_location(div11, file$d, 30, 4, 1072);
    			attr_dev(div12, "class", "line left-space");
    			add_location(div12, file$d, 31, 4, 1169);
    			add_location(br6, file$d, 34, 4, 1248);
    			attr_dev(div13, "class", "line left-space");
    			add_location(div13, file$d, 35, 4, 1257);
    			add_location(br7, file$d, 36, 4, 1308);
    			attr_dev(div14, "class", "code");
    			add_location(div14, file$d, 7, 0, 165);
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
    		id: create_fragment$d.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$d($$self, $$props, $$invalidate) {
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
    		init(this, options, instance$d, create_fragment$d, safe_not_equal, { leftbrace: 0, rightbrace: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Code3",
    			options,
    			id: create_fragment$d.name
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

    /* src/ios-sdk/page1.svelte generated by Svelte v3.50.0 */
    const file$c = "src/ios-sdk/page1.svelte";

    function create_fragment$c(ctx) {
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
    			h3.textContent = "페트리 iOS 연동";
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
    			t9 = text("\r\n일정 개수의 이벤트가 발생되었을 때 페트리 서버로 측정된 이벤트 데이터를 전송합니다.\r\n\r\n");
    			create_component(code2.$$.fragment);
    			t10 = space();
    			create_component(code3.$$.fragment);
    			attr_dev(h3, "class", "head-text");
    			add_location(h3, file$c, 9, 0, 200);
    			attr_dev(div0, "class", "title");
    			add_location(div0, file$c, 10, 0, 239);
    			attr_dev(div1, "class", "text");
    			add_location(div1, file$c, 11, 0, 273);
    			attr_dev(div2, "class", "sub-title-1");
    			add_location(div2, file$c, 16, 0, 398);
    			attr_dev(div3, "class", "sub-title-2");
    			add_location(div3, file$c, 17, 0, 444);
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
    		id: create_fragment$c.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$c($$self, $$props, $$invalidate) {
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
    		init(this, options, instance$c, create_fragment$c, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Page1",
    			options,
    			id: create_fragment$c.name
    		});
    	}
    }

    /* src/ios-sdk/code4.svelte generated by Svelte v3.50.0 */

    const file$b = "src/ios-sdk/code4.svelte";

    function create_fragment$b(ctx) {
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
    			add_location(div0, file$b, 5, 4, 93);
    			add_location(br0, file$b, 6, 4, 135);
    			attr_dev(div1, "class", "line");
    			add_location(div1, file$b, 7, 4, 144);
    			add_location(br1, file$b, 8, 4, 302);
    			attr_dev(div2, "class", "remark left-space");
    			add_location(div2, file$b, 9, 4, 311);
    			attr_dev(div3, "class", "line left-space");
    			add_location(div3, file$b, 10, 4, 370);
    			add_location(br2, file$b, 11, 4, 441);
    			attr_dev(div4, "class", "remark left-space");
    			add_location(div4, file$b, 12, 4, 450);
    			attr_dev(div5, "class", "line left-space");
    			add_location(div5, file$b, 13, 4, 526);
    			add_location(br3, file$b, 16, 4, 626);
    			attr_dev(div6, "class", "line left-space");
    			add_location(div6, file$b, 17, 4, 635);
    			add_location(br4, file$b, 18, 4, 686);
    			attr_dev(div7, "class", "code");
    			add_location(div7, file$b, 4, 0, 70);
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
    		id: create_fragment$b.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$b($$self, $$props, $$invalidate) {
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
    		init(this, options, instance$b, create_fragment$b, safe_not_equal, { leftbrace: 0, rightbrace: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Code4",
    			options,
    			id: create_fragment$b.name
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

    /* src/ios-sdk/page2.svelte generated by Svelte v3.50.0 */
    const file$a = "src/ios-sdk/page2.svelte";

    function create_fragment$a(ctx) {
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
    			h3.textContent = "페트리 iOS 연동";
    			t1 = space();
    			div0 = element("div");
    			div0.textContent = "딥 링크 이벤트";
    			t3 = text("\r\n딥 링크가 오픈되는 시점에 페트리 트래킹 코드를 호출함으로써, 콘솔에서 딥 링크 발생 이벤트에 대한 추적이 가능합니다.\r\n");
    			div1 = element("div");
    			div1.textContent = "링크 오픈 시점";
    			t5 = text("\r\n딥 링크가 오픈되는 시점에 다음과 같이 트래킹 코드를 추가하여, 패트리에 딥 링크가 오픈되었음을 알립니다.\r\n\r\n");
    			create_component(code4.$$.fragment);
    			attr_dev(h3, "class", "head-text");
    			add_location(h3, file$a, 5, 0, 116);
    			attr_dev(div0, "class", "title");
    			add_location(div0, file$a, 6, 0, 155);
    			attr_dev(div1, "class", "sub-title-1");
    			add_location(div1, file$a, 8, 0, 258);
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
    		id: create_fragment$a.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$a($$self, $$props, $$invalidate) {
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
    		init(this, options, instance$a, create_fragment$a, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Page2",
    			options,
    			id: create_fragment$a.name
    		});
    	}
    }

    /* src/ios-sdk/page3.svelte generated by Svelte v3.50.0 */

    const file$9 = "src/ios-sdk/page3.svelte";

    function create_fragment$9(ctx) {
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
    			h3.textContent = "페트리 iOS 연동";
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
    			add_location(h3, file$9, 3, 0, 27);
    			attr_dev(div, "class", "title");
    			add_location(div, file$9, 4, 0, 66);
    			add_location(li0, file$9, 11, 12, 178);
    			add_location(li1, file$9, 12, 12, 213);
    			add_location(li2, file$9, 13, 12, 241);
    			add_location(ul0, file$9, 10, 8, 160);
    			add_location(li3, file$9, 8, 4, 131);
    			add_location(li4, file$9, 16, 4, 287);
    			add_location(li5, file$9, 20, 12, 359);
    			add_location(li6, file$9, 21, 12, 386);
    			add_location(li7, file$9, 22, 12, 415);
    			add_location(li8, file$9, 23, 12, 444);
    			add_location(li9, file$9, 24, 12, 473);
    			add_location(ul1, file$9, 19, 8, 341);
    			add_location(li10, file$9, 17, 4, 308);
    			add_location(li11, file$9, 30, 12, 566);
    			add_location(li12, file$9, 31, 12, 595);
    			add_location(li13, file$9, 32, 12, 624);
    			add_location(li14, file$9, 33, 12, 653);
    			add_location(li15, file$9, 34, 12, 682);
    			add_location(li16, file$9, 35, 12, 711);
    			add_location(li17, file$9, 36, 12, 740);
    			add_location(li18, file$9, 37, 12, 769);
    			add_location(li19, file$9, 38, 12, 801);
    			add_location(li20, file$9, 39, 12, 833);
    			add_location(ul2, file$9, 29, 8, 548);
    			add_location(li21, file$9, 27, 4, 518);
    			add_location(li22, file$9, 45, 12, 931);
    			add_location(li23, file$9, 46, 12, 961);
    			add_location(li24, file$9, 47, 12, 990);
    			add_location(li25, file$9, 48, 12, 1020);
    			add_location(ul3, file$9, 44, 8, 913);
    			add_location(li26, file$9, 42, 4, 884);
    			attr_dev(ul4, "class", "page-list svelte-3wf241");
    			add_location(ul4, file$9, 7, 0, 103);
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
    		id: create_fragment$9.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$9($$self, $$props) {
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
    		init(this, options, instance$9, create_fragment$9, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Page3",
    			options,
    			id: create_fragment$9.name
    		});
    	}
    }

    /* src/ios-sdk/code5.svelte generated by Svelte v3.50.0 */

    const file$8 = "src/ios-sdk/code5.svelte";

    function create_fragment$8(ctx) {
    	let div9;
    	let br0;
    	let t0;
    	let div0;
    	let t2;
    	let div1;
    	let t4;
    	let br1;
    	let t5;
    	let div2;
    	let t7;
    	let div3;
    	let t9;
    	let br2;
    	let t10;
    	let div4;
    	let t12;
    	let div5;
    	let t13;
    	let br3;
    	let t14;
    	let br4;
    	let t15;
    	let t16;
    	let br5;
    	let t17;
    	let div6;
    	let t19;
    	let div7;
    	let t21;
    	let br6;
    	let t22;
    	let div8;
    	let t24;
    	let br7;

    	const block = {
    		c: function create() {
    			div9 = element("div");
    			br0 = element("br");
    			t0 = space();
    			div0 = element("div");
    			div0.textContent = "// 페트리 객체를 불러옵니다.";
    			t2 = space();
    			div1 = element("div");
    			div1.textContent = "let pettri = Pettri.getInstance";
    			t4 = space();
    			br1 = element("br");
    			t5 = space();
    			div2 = element("div");
    			div2.textContent = "// 회원 속성 정보 클래스를 신규로 선언합니다.";
    			t7 = space();
    			div3 = element("div");
    			div3.textContent = "let UserProperties = PettriUserProperties()";
    			t9 = space();
    			br2 = element("br");
    			t10 = space();
    			div4 = element("div");
    			div4.textContent = "// 회원을 파악할수 있는 정보를 Integer, String, Boolean 타입의 데이터를 Key/Value의 형태로 저장합니다.";
    			t12 = space();
    			div5 = element("div");
    			t13 = text("UserProperties.setIntegerData(\"age\", 34)\n        ");
    			br3 = element("br");
    			t14 = text("\n        UserProperties.setStringData(\"name\", \"pettri\")\n        ");
    			br4 = element("br");
    			t15 = text("\n        UserProperties.setBooleanData(\"married\", false)");
    			t16 = space();
    			br5 = element("br");
    			t17 = space();
    			div6 = element("div");
    			div6.textContent = "// 선언된 회원 속성 객체를 페트리 모듈에 저장하도록 합니다.";
    			t19 = space();
    			div7 = element("div");
    			div7.textContent = "pettri.setUserProperties(UserProperties)";
    			t21 = space();
    			br6 = element("br");
    			t22 = space();
    			div8 = element("div");
    			div8.textContent = "return true";
    			t24 = space();
    			br7 = element("br");
    			add_location(br0, file$8, 3, 4, 42);
    			attr_dev(div0, "class", "remark");
    			add_location(div0, file$8, 4, 4, 51);
    			attr_dev(div1, "class", "line");
    			add_location(div1, file$8, 5, 4, 99);
    			add_location(br1, file$8, 6, 4, 159);
    			attr_dev(div2, "class", "remark");
    			add_location(div2, file$8, 7, 4, 168);
    			attr_dev(div3, "class", "line");
    			add_location(div3, file$8, 8, 4, 226);
    			add_location(br2, file$8, 9, 4, 298);
    			attr_dev(div4, "class", "remark");
    			add_location(div4, file$8, 10, 4, 307);
    			add_location(br3, file$8, 13, 8, 488);
    			add_location(br4, file$8, 15, 8, 556);
    			attr_dev(div5, "class", "line");
    			add_location(div5, file$8, 11, 4, 412);
    			add_location(br5, file$8, 18, 4, 632);
    			attr_dev(div6, "class", "remark");
    			add_location(div6, file$8, 19, 4, 641);
    			attr_dev(div7, "class", "line");
    			add_location(div7, file$8, 20, 4, 707);
    			add_location(br6, file$8, 23, 4, 790);
    			attr_dev(div8, "class", "line");
    			add_location(div8, file$8, 24, 4, 799);
    			add_location(br7, file$8, 25, 4, 839);
    			attr_dev(div9, "class", "code");
    			add_location(div9, file$8, 2, 0, 19);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div9, anchor);
    			append_dev(div9, br0);
    			append_dev(div9, t0);
    			append_dev(div9, div0);
    			append_dev(div9, t2);
    			append_dev(div9, div1);
    			append_dev(div9, t4);
    			append_dev(div9, br1);
    			append_dev(div9, t5);
    			append_dev(div9, div2);
    			append_dev(div9, t7);
    			append_dev(div9, div3);
    			append_dev(div9, t9);
    			append_dev(div9, br2);
    			append_dev(div9, t10);
    			append_dev(div9, div4);
    			append_dev(div9, t12);
    			append_dev(div9, div5);
    			append_dev(div5, t13);
    			append_dev(div5, br3);
    			append_dev(div5, t14);
    			append_dev(div5, br4);
    			append_dev(div5, t15);
    			append_dev(div9, t16);
    			append_dev(div9, br5);
    			append_dev(div9, t17);
    			append_dev(div9, div6);
    			append_dev(div9, t19);
    			append_dev(div9, div7);
    			append_dev(div9, t21);
    			append_dev(div9, br6);
    			append_dev(div9, t22);
    			append_dev(div9, div8);
    			append_dev(div9, t24);
    			append_dev(div9, br7);
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
    		id: create_fragment$8.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$8($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Code5', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Code5> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class Code5 extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$8, create_fragment$8, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Code5",
    			options,
    			id: create_fragment$8.name
    		});
    	}
    }

    /* src/ios-sdk/code6.svelte generated by Svelte v3.50.0 */

    const file$7 = "src/ios-sdk/code6.svelte";

    function create_fragment$7(ctx) {
    	let div7;
    	let br0;
    	let t0;
    	let div0;
    	let t2;
    	let div1;
    	let t4;
    	let br1;
    	let t5;
    	let div2;
    	let t7;
    	let div3;
    	let t9;
    	let br2;
    	let t10;
    	let div4;
    	let t12;
    	let div5;
    	let t14;
    	let br3;
    	let t15;
    	let div6;
    	let t17;
    	let br4;

    	const block = {
    		c: function create() {
    			div7 = element("div");
    			br0 = element("br");
    			t0 = space();
    			div0 = element("div");
    			div0.textContent = "// 페트리 객체를 불러옵니다.";
    			t2 = space();
    			div1 = element("div");
    			div1.textContent = "let pettri = Pettri.getInstance";
    			t4 = space();
    			br1 = element("br");
    			t5 = space();
    			div2 = element("div");
    			div2.textContent = "// 회원이 로그인하였을 때 로그인 알림을 페트리 서버로 전송합니다.";
    			t7 = space();
    			div3 = element("div");
    			div3.textContent = "pettri.login().setId(userId:\"user1234\")";
    			t9 = space();
    			br2 = element("br");
    			t10 = space();
    			div4 = element("div");
    			div4.textContent = "// 회원이 로그아웃하였을 때 로그아웃 알림을 페트리 서버로 전송합니다.";
    			t12 = space();
    			div5 = element("div");
    			div5.textContent = "pettri.logout()";
    			t14 = space();
    			br3 = element("br");
    			t15 = space();
    			div6 = element("div");
    			div6.textContent = "return true";
    			t17 = space();
    			br4 = element("br");
    			add_location(br0, file$7, 3, 4, 42);
    			attr_dev(div0, "class", "remark");
    			add_location(div0, file$7, 4, 4, 51);
    			attr_dev(div1, "class", "line");
    			add_location(div1, file$7, 5, 4, 99);
    			add_location(br1, file$7, 6, 4, 159);
    			attr_dev(div2, "class", "remark");
    			add_location(div2, file$7, 7, 4, 168);
    			attr_dev(div3, "class", "line");
    			add_location(div3, file$7, 8, 4, 237);
    			add_location(br2, file$7, 11, 4, 319);
    			attr_dev(div4, "class", "remark");
    			add_location(div4, file$7, 12, 4, 328);
    			attr_dev(div5, "class", "line");
    			add_location(div5, file$7, 13, 4, 399);
    			add_location(br3, file$7, 16, 4, 457);
    			attr_dev(div6, "class", "line");
    			add_location(div6, file$7, 17, 4, 466);
    			add_location(br4, file$7, 18, 4, 506);
    			attr_dev(div7, "class", "code");
    			add_location(div7, file$7, 2, 0, 19);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div7, anchor);
    			append_dev(div7, br0);
    			append_dev(div7, t0);
    			append_dev(div7, div0);
    			append_dev(div7, t2);
    			append_dev(div7, div1);
    			append_dev(div7, t4);
    			append_dev(div7, br1);
    			append_dev(div7, t5);
    			append_dev(div7, div2);
    			append_dev(div7, t7);
    			append_dev(div7, div3);
    			append_dev(div7, t9);
    			append_dev(div7, br2);
    			append_dev(div7, t10);
    			append_dev(div7, div4);
    			append_dev(div7, t12);
    			append_dev(div7, div5);
    			append_dev(div7, t14);
    			append_dev(div7, br3);
    			append_dev(div7, t15);
    			append_dev(div7, div6);
    			append_dev(div7, t17);
    			append_dev(div7, br4);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div7);
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

    function instance$7($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Code6', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Code6> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class Code6 extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$7, create_fragment$7, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Code6",
    			options,
    			id: create_fragment$7.name
    		});
    	}
    }

    /* src/ios-sdk/code7.svelte generated by Svelte v3.50.0 */

    const file$6 = "src/ios-sdk/code7.svelte";

    function create_fragment$6(ctx) {
    	let div5;
    	let br0;
    	let t0;
    	let div0;
    	let t2;
    	let div1;
    	let t4;
    	let br1;
    	let t5;
    	let div2;
    	let t7;
    	let div3;
    	let t9;
    	let br2;
    	let t10;
    	let div4;
    	let t12;
    	let br3;

    	const block = {
    		c: function create() {
    			div5 = element("div");
    			br0 = element("br");
    			t0 = space();
    			div0 = element("div");
    			div0.textContent = "// 페트리 객체를 불러옵니다.";
    			t2 = space();
    			div1 = element("div");
    			div1.textContent = "let pettri = Pettri.getInstance";
    			t4 = space();
    			br1 = element("br");
    			t5 = space();
    			div2 = element("div");
    			div2.textContent = "// 현재 위치의 위도와 경도를 페트리 서버로 전송합니다.";
    			t7 = space();
    			div3 = element("div");
    			div3.textContent = "pettri.setLoc(latitude:32.222, longitutde:111.111)";
    			t9 = space();
    			br2 = element("br");
    			t10 = space();
    			div4 = element("div");
    			div4.textContent = "return true";
    			t12 = space();
    			br3 = element("br");
    			add_location(br0, file$6, 3, 4, 42);
    			attr_dev(div0, "class", "remark");
    			add_location(div0, file$6, 4, 4, 51);
    			attr_dev(div1, "class", "line");
    			add_location(div1, file$6, 5, 4, 99);
    			add_location(br1, file$6, 6, 4, 159);
    			attr_dev(div2, "class", "remark");
    			add_location(div2, file$6, 7, 4, 168);
    			attr_dev(div3, "class", "line");
    			add_location(div3, file$6, 8, 4, 231);
    			add_location(br2, file$6, 11, 4, 324);
    			attr_dev(div4, "class", "line");
    			add_location(div4, file$6, 12, 4, 333);
    			add_location(br3, file$6, 13, 4, 373);
    			attr_dev(div5, "class", "code");
    			add_location(div5, file$6, 2, 0, 19);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div5, anchor);
    			append_dev(div5, br0);
    			append_dev(div5, t0);
    			append_dev(div5, div0);
    			append_dev(div5, t2);
    			append_dev(div5, div1);
    			append_dev(div5, t4);
    			append_dev(div5, br1);
    			append_dev(div5, t5);
    			append_dev(div5, div2);
    			append_dev(div5, t7);
    			append_dev(div5, div3);
    			append_dev(div5, t9);
    			append_dev(div5, br2);
    			append_dev(div5, t10);
    			append_dev(div5, div4);
    			append_dev(div5, t12);
    			append_dev(div5, br3);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div5);
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

    function instance$6($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Code7', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Code7> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class Code7 extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$6, create_fragment$6, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Code7",
    			options,
    			id: create_fragment$6.name
    		});
    	}
    }

    /* src/ios-sdk/page4.svelte generated by Svelte v3.50.0 */
    const file$5 = "src/ios-sdk/page4.svelte";

    function create_fragment$5(ctx) {
    	let h3;
    	let t1;
    	let div0;
    	let t3;
    	let div1;
    	let t5;
    	let code6;
    	let t6;
    	let div2;
    	let t8;
    	let code5;
    	let t9;
    	let div3;
    	let t11;
    	let code7;
    	let current;

    	code6 = new Code6({
    			props: {
    				leftbrace: /*leftbrace*/ ctx[0],
    				rightbrace: /*rightbrace*/ ctx[1]
    			},
    			$$inline: true
    		});

    	code5 = new Code5({ $$inline: true });
    	code7 = new Code7({ $$inline: true });

    	const block = {
    		c: function create() {
    			h3 = element("h3");
    			h3.textContent = "페트리 iOS 연동";
    			t1 = space();
    			div0 = element("div");
    			div0.textContent = "유저 분석";
    			t3 = space();
    			div1 = element("div");
    			div1.textContent = "로그인 / 로그아웃";
    			t5 = text("\r\n딥 링크가 오픈되는 시점에 다음과 같이 트래킹 코드를 추가하여, 패트리에 딥 링크가 오픈되었음을 알립니다.\r\n\r\n");
    			create_component(code6.$$.fragment);
    			t6 = space();
    			div2 = element("div");
    			div2.textContent = "회원 정보";
    			t8 = text("\r\n회원에 대해서 파악가능한 지표를 페트리 서버에 전송하여 분석에 활용할 수 있습니다.\r\n\r\n");
    			create_component(code5.$$.fragment);
    			t9 = space();
    			div3 = element("div");
    			div3.textContent = "위치 정보";
    			t11 = text("\r\n현재 회원의 위치 정보를 페트리 서버에 전송하여 분석에 활용할 수 있습니다.\r\n\r\n");
    			create_component(code7.$$.fragment);
    			attr_dev(h3, "class", "head-text");
    			add_location(h3, file$5, 7, 0, 196);
    			attr_dev(div0, "class", "title");
    			add_location(div0, file$5, 8, 0, 235);
    			attr_dev(div1, "class", "sub-title-1 no-mgtop");
    			add_location(div1, file$5, 10, 0, 269);
    			attr_dev(div2, "class", "sub-title-1");
    			add_location(div2, file$5, 15, 0, 442);
    			attr_dev(div3, "class", "sub-title-1");
    			add_location(div3, file$5, 20, 0, 542);
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
    			mount_component(code6, target, anchor);
    			insert_dev(target, t6, anchor);
    			insert_dev(target, div2, anchor);
    			insert_dev(target, t8, anchor);
    			mount_component(code5, target, anchor);
    			insert_dev(target, t9, anchor);
    			insert_dev(target, div3, anchor);
    			insert_dev(target, t11, anchor);
    			mount_component(code7, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(code6.$$.fragment, local);
    			transition_in(code5.$$.fragment, local);
    			transition_in(code7.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(code6.$$.fragment, local);
    			transition_out(code5.$$.fragment, local);
    			transition_out(code7.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h3);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(div0);
    			if (detaching) detach_dev(t3);
    			if (detaching) detach_dev(div1);
    			if (detaching) detach_dev(t5);
    			destroy_component(code6, detaching);
    			if (detaching) detach_dev(t6);
    			if (detaching) detach_dev(div2);
    			if (detaching) detach_dev(t8);
    			destroy_component(code5, detaching);
    			if (detaching) detach_dev(t9);
    			if (detaching) detach_dev(div3);
    			if (detaching) detach_dev(t11);
    			destroy_component(code7, detaching);
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
    	validate_slots('Page4', slots, []);
    	let leftbrace = "{";
    	let rightbrace = "}";
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Page4> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({
    		Code5,
    		Code6,
    		Code7,
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

    class Page4 extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$5, create_fragment$5, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Page4",
    			options,
    			id: create_fragment$5.name
    		});
    	}
    }

    /* src/ios-sdk/page5.svelte generated by Svelte v3.50.0 */

    const file$4 = "src/ios-sdk/page5.svelte";

    function create_fragment$4(ctx) {
    	let h3;
    	let t1;
    	let div;

    	const block = {
    		c: function create() {
    			h3 = element("h3");
    			h3.textContent = "페트리 iOS 연동";
    			t1 = space();
    			div = element("div");
    			div.textContent = "커스텀 분석";
    			attr_dev(h3, "class", "head-text");
    			add_location(h3, file$4, 3, 0, 27);
    			attr_dev(div, "class", "title");
    			add_location(div, file$4, 4, 0, 66);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h3, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, div, anchor);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h3);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(div);
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

    function instance$4($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Page5', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Page5> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class Page5 extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Page5",
    			options,
    			id: create_fragment$4.name
    		});
    	}
    }

    /* src/ios-sdk/page6.svelte generated by Svelte v3.50.0 */

    const file$3 = "src/ios-sdk/page6.svelte";

    function create_fragment$3(ctx) {
    	let h3;
    	let t1;
    	let div;

    	const block = {
    		c: function create() {
    			h3 = element("h3");
    			h3.textContent = "페트리 iOS 연동";
    			t1 = space();
    			div = element("div");
    			div.textContent = "일반 분석";
    			attr_dev(h3, "class", "head-text");
    			add_location(h3, file$3, 3, 0, 27);
    			attr_dev(div, "class", "title");
    			add_location(div, file$3, 4, 0, 66);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h3, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, div, anchor);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h3);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(div);
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

    function instance$3($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Page6', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Page6> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class Page6 extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Page6",
    			options,
    			id: create_fragment$3.name
    		});
    	}
    }

    /* src/ios-sdk/page7.svelte generated by Svelte v3.50.0 */

    const file$2 = "src/ios-sdk/page7.svelte";

    function create_fragment$2(ctx) {
    	let h3;
    	let t1;
    	let div;

    	const block = {
    		c: function create() {
    			h3 = element("h3");
    			h3.textContent = "페트리 iOS 연동";
    			t1 = space();
    			div = element("div");
    			div.textContent = "커머스 분석";
    			attr_dev(h3, "class", "head-text");
    			add_location(h3, file$2, 3, 0, 27);
    			attr_dev(div, "class", "title");
    			add_location(div, file$2, 4, 0, 66);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h3, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, div, anchor);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h3);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(div);
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

    function instance$2($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Page7', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Page7> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class Page7 extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Page7",
    			options,
    			id: create_fragment$2.name
    		});
    	}
    }

    /* src/ios-sdk/page8.svelte generated by Svelte v3.50.0 */

    const file$1 = "src/ios-sdk/page8.svelte";

    function create_fragment$1(ctx) {
    	let h3;

    	const block = {
    		c: function create() {
    			h3 = element("h3");
    			h3.textContent = "페트리 iOS 연동";
    			attr_dev(h3, "class", "head-text");
    			add_location(h3, file$1, 3, 0, 27);
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
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Page8', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Page8> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class Page8 extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Page8",
    			options,
    			id: create_fragment$1.name
    		});
    	}
    }

    /* src/App.svelte generated by Svelte v3.50.0 */
    const file = "src/App.svelte";

    // (17:2) <Router>
    function create_default_slot_10(ctx) {
    	let ul3;
    	let li10;
    	let ul2;
    	let i;
    	let t0;
    	let li0;
    	let t2;
    	let ul1;
    	let a0;
    	let li1;
    	let t4;
    	let a1;
    	let li2;
    	let t6;
    	let a2;
    	let li3;
    	let t8;
    	let ul0;
    	let a3;
    	let li4;
    	let t10;
    	let a4;
    	let li5;
    	let t12;
    	let a5;
    	let li6;
    	let t14;
    	let a6;
    	let li7;
    	let t16;
    	let a7;
    	let li8;
    	let t18;
    	let a8;
    	let li9;

    	const block = {
    		c: function create() {
    			ul3 = element("ul");
    			li10 = element("li");
    			ul2 = element("ul");
    			i = element("i");
    			t0 = text("SDK 연동 가이드 \n\t\t\t\t\t\t");
    			li0 = element("li");
    			li0.textContent = "iOS SDK";
    			t2 = space();
    			ul1 = element("ul");
    			a0 = element("a");
    			li1 = element("li");
    			li1.textContent = "페트리 초기화";
    			t4 = space();
    			a1 = element("a");
    			li2 = element("li");
    			li2.textContent = "딥 링크 이벤트";
    			t6 = space();
    			a2 = element("a");
    			li3 = element("li");
    			li3.textContent = "이벤트 분석";
    			t8 = space();
    			ul0 = element("ul");
    			a3 = element("a");
    			li4 = element("li");
    			li4.textContent = "유저 분석";
    			t10 = space();
    			a4 = element("a");
    			li5 = element("li");
    			li5.textContent = "커스텀 분석";
    			t12 = space();
    			a5 = element("a");
    			li6 = element("li");
    			li6.textContent = "일반 분석";
    			t14 = space();
    			a6 = element("a");
    			li7 = element("li");
    			li7.textContent = "커머스 분석";
    			t16 = space();
    			a7 = element("a");
    			li8 = element("li");
    			li8.textContent = "게임 분석";
    			t18 = space();
    			a8 = element("a");
    			li9 = element("li");
    			li9.textContent = "Android SDK";
    			attr_dev(i, "class", "bi bi-gear nav-icon svelte-195ch6i");
    			add_location(i, file, 20, 6, 772);
    			attr_dev(li0, "class", "sdk svelte-195ch6i");
    			add_location(li0, file, 21, 6, 825);
    			add_location(li1, file, 23, 28, 905);
    			attr_dev(a0, "href", "/ios-sdk-1");
    			add_location(a0, file, 23, 7, 884);
    			add_location(li2, file, 24, 28, 954);
    			attr_dev(a1, "href", "/ios-sdk-2");
    			add_location(a1, file, 24, 7, 933);
    			add_location(li3, file, 25, 28, 1004);
    			attr_dev(a2, "href", "/ios-sdk-3");
    			add_location(a2, file, 25, 7, 983);
    			add_location(li4, file, 27, 29, 1065);
    			attr_dev(a3, "href", "/ios-sdk-4");
    			add_location(a3, file, 27, 8, 1044);
    			add_location(li5, file, 28, 29, 1113);
    			attr_dev(a4, "href", "/ios-sdk-5");
    			add_location(a4, file, 28, 8, 1092);
    			add_location(li6, file, 29, 29, 1162);
    			attr_dev(a5, "href", "/ios-sdk-6");
    			add_location(a5, file, 29, 8, 1141);
    			add_location(li7, file, 30, 29, 1210);
    			attr_dev(a6, "href", "/ios-sdk-7");
    			add_location(a6, file, 30, 8, 1189);
    			add_location(li8, file, 31, 29, 1259);
    			attr_dev(a7, "href", "/ios-sdk-8");
    			add_location(a7, file, 31, 8, 1238);
    			add_location(ul0, file, 26, 7, 1031);
    			attr_dev(ul1, "class", "sdk");
    			add_location(ul1, file, 22, 6, 860);
    			attr_dev(li9, "class", "sdk svelte-195ch6i");
    			add_location(li9, file, 34, 28, 1331);
    			attr_dev(a8, "href", "/sdkguide2");
    			add_location(a8, file, 34, 6, 1309);
    			attr_dev(ul2, "class", "nav-link-li");
    			add_location(ul2, file, 19, 5, 741);
    			add_location(li10, file, 18, 4, 731);
    			attr_dev(ul3, "class", "nav-no-bullets svelte-195ch6i");
    			add_location(ul3, file, 17, 3, 699);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, ul3, anchor);
    			append_dev(ul3, li10);
    			append_dev(li10, ul2);
    			append_dev(ul2, i);
    			append_dev(ul2, t0);
    			append_dev(ul2, li0);
    			append_dev(ul2, t2);
    			append_dev(ul2, ul1);
    			append_dev(ul1, a0);
    			append_dev(a0, li1);
    			append_dev(ul1, t4);
    			append_dev(ul1, a1);
    			append_dev(a1, li2);
    			append_dev(ul1, t6);
    			append_dev(ul1, a2);
    			append_dev(a2, li3);
    			append_dev(ul1, t8);
    			append_dev(ul1, ul0);
    			append_dev(ul0, a3);
    			append_dev(a3, li4);
    			append_dev(ul0, t10);
    			append_dev(ul0, a4);
    			append_dev(a4, li5);
    			append_dev(ul0, t12);
    			append_dev(ul0, a5);
    			append_dev(a5, li6);
    			append_dev(ul0, t14);
    			append_dev(ul0, a6);
    			append_dev(a6, li7);
    			append_dev(ul0, t16);
    			append_dev(ul0, a7);
    			append_dev(a7, li8);
    			append_dev(ul2, t18);
    			append_dev(ul2, a8);
    			append_dev(a8, li9);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(ul3);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_10.name,
    		type: "slot",
    		source: "(17:2) <Router>",
    		ctx
    	});

    	return block;
    }

    // (49:4) <Route path="/sdkguide2" primary={false}>
    function create_default_slot_9(ctx) {
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
    		id: create_default_slot_9.name,
    		type: "slot",
    		source: "(49:4) <Route path=\\\"/sdkguide2\\\" primary={false}>",
    		ctx
    	});

    	return block;
    }

    // (54:4) <Route path="/ios-sdk-1" primary={false}>
    function create_default_slot_8(ctx) {
    	let iossdk1;
    	let current;
    	iossdk1 = new Page1({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(iossdk1.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(iossdk1, target, anchor);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(iossdk1.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(iossdk1.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(iossdk1, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_8.name,
    		type: "slot",
    		source: "(54:4) <Route path=\\\"/ios-sdk-1\\\" primary={false}>",
    		ctx
    	});

    	return block;
    }

    // (59:4) <Route path="/ios-sdk-2" primary={false}>
    function create_default_slot_7(ctx) {
    	let iossdk2;
    	let current;
    	iossdk2 = new Page2({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(iossdk2.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(iossdk2, target, anchor);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(iossdk2.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(iossdk2.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(iossdk2, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_7.name,
    		type: "slot",
    		source: "(59:4) <Route path=\\\"/ios-sdk-2\\\" primary={false}>",
    		ctx
    	});

    	return block;
    }

    // (64:4) <Route path="/ios-sdk-3" primary={false}>
    function create_default_slot_6(ctx) {
    	let iossdk3;
    	let current;
    	iossdk3 = new Page3({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(iossdk3.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(iossdk3, target, anchor);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(iossdk3.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(iossdk3.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(iossdk3, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_6.name,
    		type: "slot",
    		source: "(64:4) <Route path=\\\"/ios-sdk-3\\\" primary={false}>",
    		ctx
    	});

    	return block;
    }

    // (69:4) <Route path="/ios-sdk-4" primary={false}>
    function create_default_slot_5(ctx) {
    	let iossdk4;
    	let current;
    	iossdk4 = new Page4({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(iossdk4.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(iossdk4, target, anchor);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(iossdk4.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(iossdk4.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(iossdk4, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_5.name,
    		type: "slot",
    		source: "(69:4) <Route path=\\\"/ios-sdk-4\\\" primary={false}>",
    		ctx
    	});

    	return block;
    }

    // (74:4) <Route path="/ios-sdk-5" primary={false}>
    function create_default_slot_4(ctx) {
    	let iossdk5;
    	let current;
    	iossdk5 = new Page5({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(iossdk5.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(iossdk5, target, anchor);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(iossdk5.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(iossdk5.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(iossdk5, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_4.name,
    		type: "slot",
    		source: "(74:4) <Route path=\\\"/ios-sdk-5\\\" primary={false}>",
    		ctx
    	});

    	return block;
    }

    // (79:4) <Route path="/ios-sdk-6" primary={false}>
    function create_default_slot_3(ctx) {
    	let iossdk6;
    	let current;
    	iossdk6 = new Page6({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(iossdk6.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(iossdk6, target, anchor);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(iossdk6.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(iossdk6.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(iossdk6, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_3.name,
    		type: "slot",
    		source: "(79:4) <Route path=\\\"/ios-sdk-6\\\" primary={false}>",
    		ctx
    	});

    	return block;
    }

    // (84:4) <Route path="/ios-sdk-7" primary={false}>
    function create_default_slot_2(ctx) {
    	let iossdk7;
    	let current;
    	iossdk7 = new Page7({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(iossdk7.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(iossdk7, target, anchor);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(iossdk7.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(iossdk7.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(iossdk7, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_2.name,
    		type: "slot",
    		source: "(84:4) <Route path=\\\"/ios-sdk-7\\\" primary={false}>",
    		ctx
    	});

    	return block;
    }

    // (89:4) <Route path="/ios-sdk-8" primary={false}>
    function create_default_slot_1(ctx) {
    	let iossdk8;
    	let current;
    	iossdk8 = new Page8({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(iossdk8.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(iossdk8, target, anchor);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(iossdk8.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(iossdk8.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(iossdk8, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_1.name,
    		type: "slot",
    		source: "(89:4) <Route path=\\\"/ios-sdk-8\\\" primary={false}>",
    		ctx
    	});

    	return block;
    }

    // (46:3) <Router>
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
    	let current;

    	route0 = new Route$1({
    			props: {
    				path: "/sdkguide2",
    				primary: false,
    				$$slots: { default: [create_default_slot_9] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	route1 = new Route$1({
    			props: {
    				path: "/ios-sdk-1",
    				primary: false,
    				$$slots: { default: [create_default_slot_8] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	route2 = new Route$1({
    			props: {
    				path: "/ios-sdk-2",
    				primary: false,
    				$$slots: { default: [create_default_slot_7] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	route3 = new Route$1({
    			props: {
    				path: "/ios-sdk-3",
    				primary: false,
    				$$slots: { default: [create_default_slot_6] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	route4 = new Route$1({
    			props: {
    				path: "/ios-sdk-4",
    				primary: false,
    				$$slots: { default: [create_default_slot_5] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	route5 = new Route$1({
    			props: {
    				path: "/ios-sdk-5",
    				primary: false,
    				$$slots: { default: [create_default_slot_4] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	route6 = new Route$1({
    			props: {
    				path: "/ios-sdk-6",
    				primary: false,
    				$$slots: { default: [create_default_slot_3] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	route7 = new Route$1({
    			props: {
    				path: "/ios-sdk-7",
    				primary: false,
    				$$slots: { default: [create_default_slot_2] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	route8 = new Route$1({
    			props: {
    				path: "/ios-sdk-8",
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
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot.name,
    		type: "slot",
    		source: "(46:3) <Router>",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let main;
    	let div0;
    	let span;
    	let t1;
    	let div1;
    	let router0;
    	let t2;
    	let div3;
    	let div2;
    	let router1;
    	let current;

    	router0 = new Router$1({
    			props: {
    				$$slots: { default: [create_default_slot_10] },
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
    			div1 = element("div");
    			create_component(router0.$$.fragment);
    			t2 = space();
    			div3 = element("div");
    			div2 = element("div");
    			create_component(router1.$$.fragment);
    			attr_dev(span, "class", "nav-open-menu svelte-195ch6i");
    			attr_dev(span, "id", "open-menu");
    			attr_dev(span, "onclick", "openMenu()");
    			add_location(span, file, 14, 23, 567);
    			attr_dev(div0, "class", "top-cont svelte-195ch6i");
    			add_location(div0, file, 14, 1, 545);
    			attr_dev(div1, "class", "nav svelte-195ch6i");
    			attr_dev(div1, "id", "left-menu");
    			add_location(div1, file, 15, 1, 652);
    			attr_dev(div2, "class", "mid-cont svelte-195ch6i");
    			add_location(div2, file, 44, 2, 1456);
    			attr_dev(div3, "class", "cont svelte-195ch6i");
    			attr_dev(div3, "id", "main");
    			add_location(div3, file, 41, 1, 1421);
    			attr_dev(main, "class", "svelte-195ch6i");
    			add_location(main, file, 13, 0, 537);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			append_dev(main, div0);
    			append_dev(div0, span);
    			append_dev(main, t1);
    			append_dev(main, div1);
    			mount_component(router0, div1, null);
    			append_dev(main, t2);
    			append_dev(main, div3);
    			append_dev(div3, div2);
    			mount_component(router1, div2, null);
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
    		SDKGuide2,
    		IOSSDK1: Page1,
    		IOSSDK2: Page2,
    		IOSSDK3: Page3,
    		IOSSDK4: Page4,
    		IOSSDK5: Page5,
    		IOSSDK6: Page6,
    		IOSSDK7: Page7,
    		IOSSDK8: Page8
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
