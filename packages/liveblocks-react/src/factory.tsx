import type {
  BaseUserMeta,
  BroadcastOptions,
  Client,
  History,
  Json,
  JsonObject,
  Lson,
  LsonObject,
  Others,
  Room,
  User,
} from "@liveblocks/client";
import { LiveList, LiveMap, LiveObject } from "@liveblocks/client";
import type { Resolve, RoomInitializers } from "@liveblocks/client/internal";
import { deprecate, errorIf } from "@liveblocks/client/internal";
import * as React from "react";

import { useClient as _useClient } from "./client";
import { useRerender } from "./hooks";

/**
 * "Freezes" a given value, so that it will return the same value/instance on
 * each subsequent render. This can be used to freeze "initial" values for
 * custom hooks, much like how `useState(initialState)` or
 * `useRef(initialValue)` works.
 */
function useInitial<T>(value: T): T {
  return React.useRef(value).current;
}

export type RoomProviderProps<
  TPresence extends JsonObject,
  TStorage extends LsonObject
> = Resolve<
  {
    /**
     * The id of the room you want to connect to
     */
    id: string;
    children: React.ReactNode;
  } & RoomInitializers<TPresence, TStorage>
>;

type RoomContextBundle<
  TPresence extends JsonObject,
  TStorage extends LsonObject,
  TUserMeta extends BaseUserMeta,
  TRoomEvent extends Json
> = {
  RoomContext: React.Context<Room<
    TPresence,
    TStorage,
    TUserMeta,
    TRoomEvent
  > | null>;

  /**
   * Makes a Room available in the component hierarchy below.
   * When this component is unmounted, the current user leave the room.
   * That means that you can't have 2 RoomProvider with the same room id in your react tree.
   */
  RoomProvider(props: RoomProviderProps<TPresence, TStorage>): JSX.Element;

  /**
   * Returns a function that batches modifications made during the given function.
   * All the modifications are sent to other clients in a single message.
   * All the modifications are merged in a single history item (undo/redo).
   * All the subscribers are called only after the batch is over.
   */
  useBatch(): (callback: () => void) => void;

  /**
   * Returns a callback that lets you broadcast custom events to other users in the room
   *
   * @example
   * const broadcast = useBroadcastEvent();
   *
   * broadcast({ type: "CUSTOM_EVENT", data: { x: 0, y: 0 } });
   */
  useBroadcastEvent(): (event: TRoomEvent, options?: BroadcastOptions) => void;

  /**
   * useErrorListener is a react hook that lets you react to potential room connection errors.
   *
   * @example
   * useErrorListener(er => {
   *   console.error(er);
   * })
   */
  useErrorListener(callback: (err: Error) => void): void;

  /**
   * useEventListener is a react hook that lets you react to event broadcasted by other users in the room.
   *
   * @example
   * useEventListener(({ connectionId, event }) => {
   *   if (event.type === "CUSTOM_EVENT") {
   *     // Do something
   *   }
   * });
   */
  useEventListener(
    callback: (eventData: { connectionId: number; event: TRoomEvent }) => void
  ): void;

  /**
   * Returns the room.history
   */
  useHistory(): History;

  /**
   * Returns a function that undoes the last operation executed by the current client.
   * It does not impact operations made by other clients.
   */
  useUndo(): () => void;

  /**
   * Returns a function that redoes the last operation executed by the current client.
   * It does not impact operations made by other clients.
   */
  useRedo(): () => void;

  /**
   * Returns whether there are any operations to undo.
   */
  useCanUndo(): boolean;

  /**
   * Returns whether there are any operations to redo.
   */
  useCanRedo(): boolean;

  /**
   * Returns the LiveList associated with the provided key.
   * The hook triggers a re-render if the LiveList is updated, however it does not triggers a re-render if a nested CRDT is updated.
   *
   * @param key The storage key associated with the LiveList
   * @returns null while the storage is loading, otherwise, returns the LiveList associated to the storage
   *
   * @example
   * const animals = useList("animals");  // e.g. [] or ["🦁", "🐍", "🦍"]
   */
  useList<TKey extends Extract<keyof TStorage, string>>(
    key: TKey
  ): TStorage[TKey] | null;

  /**
   * Returns the LiveMap associated with the provided key. If the LiveMap does not exist, a new empty LiveMap will be created.
   * The hook triggers a re-render if the LiveMap is updated, however it does not triggers a re-render if a nested CRDT is updated.
   *
   * @param key The storage key associated with the LiveMap
   * @returns null while the storage is loading, otherwise, returns the LiveMap associated to the storage
   *
   * @example
   * const shapesById = useMap("shapes");
   */
  useMap<TKey extends Extract<keyof TStorage, string>>(
    key: TKey
  ): TStorage[TKey] | null;

  /**
   * Returns the LiveObject associated with the provided key.
   * The hook triggers a re-render if the LiveObject is updated, however it does not triggers a re-render if a nested CRDT is updated.
   *
   * @param key The storage key associated with the LiveObject
   * @returns null while the storage is loading, otherwise, returns the LveObject associated to the storage
   *
   * @example
   * const object = useObject("obj");
   */
  useObject<TKey extends Extract<keyof TStorage, string>>(
    key: TKey
  ): TStorage[TKey] | null;

  /**
   * Returns the presence of the current user of the current room, and a function to update it.
   * It is different from the setState function returned by the useState hook from React.
   * You don't need to pass the full presence object to update it.
   *
   * @example
   * const [myPresence, updateMyPresence] = useMyPresence();
   * updateMyPresence({ x: 0 });
   * updateMyPresence({ y: 0 });
   *
   * // At the next render, "myPresence" will be equal to "{ x: 0, y: 0 }"
   */
  useMyPresence(): [
    TPresence,
    (overrides: Partial<TPresence>, options?: { addToHistory: boolean }) => void
  ];

  /**
   * Returns an object that lets you get information about all the the users currently connected in the room.
   *
   * @example
   * const others = useOthers();
   *
   * // Example to map all cursors in JSX
   * {
   *   others.map((user) => {
   *     if (user.presence?.cursor == null) {
   *       return null;
   *     }
   *     return <Cursor key={user.connectionId} cursor={user.presence.cursor} />
   *   })
   * }
   */
  useOthers(): Others<TPresence, TUserMeta>;

  /**
   * Returns the Room of the nearest RoomProvider above in the React component
   * tree.
   */
  useRoom(): Room<TPresence, TStorage, TUserMeta, TRoomEvent>;

  /**
   * Gets the current user once it is connected to the room.
   *
   * @example
   * const user = useSelf();
   */
  useSelf(): User<TPresence, TUserMeta> | null;

  /**
   * Returns the LiveObject instance that is the root of your entire Liveblocks
   * Storage.
   *
   * @example
   * const [root] = useStorageRoot();
   */
  useStorageRoot(): [root: LiveObject<TStorage> | null];

  /**
   * @deprecated In the next major version, we're changing the meaning of `useStorage()`.
   * Please use `useStorageRoot()` instead for the current behavior.
   */
  useStorage(): [root: LiveObject<TStorage> | null];

  /**
   * useUpdateMyPresence is similar to useMyPresence but it only returns the function to update the current user presence.
   * If you don't use the current user presence in your component, but you need to update it (e.g. live cursor), it's better to use useUpdateMyPresence to avoid unnecessary renders.
   *
   * @example
   * const updateMyPresence = useUpdateMyPresence();
   * updateMyPresence({ x: 0 });
   * updateMyPresence({ y: 0 });
   *
   * // At the next render, the presence of the current user will be equal to "{ x: 0, y: 0 }"
   */
  useUpdateMyPresence(): (
    overrides: Partial<TPresence>,
    options?: { addToHistory: boolean }
  ) => void;

  // ....................................................................................

  /**
   * Returns the LiveList associated with the provided key.
   * The hook triggers a re-render if the LiveList is updated, however it does not triggers a re-render if a nested CRDT is updated.
   *
   * @param key The storage key associated with the LiveList
   * @returns null while the storage is loading, otherwise, returns the LiveList associated to the storage
   *
   * @example
   * const animals = useList("animals");  // e.g. [] or ["🦁", "🐍", "🦍"]
   */
  useList_deprecated<TValue extends Lson>(key: string): LiveList<TValue> | null;

  /**
   * @deprecated We no longer recommend initializing the
   * items from the useList() hook. For details, see https://bit.ly/3Niy5aP.
   */
  useList_deprecated<TValue extends Lson>(
    key: string,
    items: TValue[]
  ): LiveList<TValue> | null;

  /**
   * Returns the LiveMap associated with the provided key. If the LiveMap does not exist, a new empty LiveMap will be created.
   * The hook triggers a re-render if the LiveMap is updated, however it does not triggers a re-render if a nested CRDT is updated.
   *
   * @param key The storage key associated with the LiveMap
   * @returns null while the storage is loading, otherwise, returns the LiveMap associated to the storage
   *
   * @example
   * const shapesById = useMap("shapes");
   */
  useMap_deprecated<TKey extends string, TValue extends Lson>(
    key: string
  ): LiveMap<TKey, TValue> | null;

  /**
   * @deprecated We no longer recommend initializing the
   * entries from the useMap() hook. For details, see https://bit.ly/3Niy5aP.
   */
  useMap_deprecated<TKey extends string, TValue extends Lson>(
    key: string,
    entries: readonly (readonly [TKey, TValue])[] | null
  ): LiveMap<TKey, TValue> | null;

  /**
   * Returns the LiveObject associated with the provided key.
   * The hook triggers a re-render if the LiveObject is updated, however it does not triggers a re-render if a nested CRDT is updated.
   *
   * @param key The storage key associated with the LiveObject
   * @returns null while the storage is loading, otherwise, returns the LveObject associated to the storage
   *
   * @example
   * const object = useObject("obj");
   */
  useObject_deprecated<TData extends LsonObject>(
    key: string
  ): LiveObject<TData> | null;

  /**
   * @deprecated We no longer recommend initializing the fields from the
   * useObject() hook. For details, see https://bit.ly/3Niy5aP.
   */
  useObject_deprecated<TData extends LsonObject>(
    key: string,
    initialData: TData
  ): LiveObject<TData> | null;
};

type LookupResult<T> =
  | { status: "ok"; value: T }
  | { status: "loading" }
  | { status: "notfound" };

export function createRoomContext<
  TPresence extends JsonObject,
  TStorage extends LsonObject = LsonObject,
  TUserMeta extends BaseUserMeta = BaseUserMeta,
  TRoomEvent extends Json = never
>(
  client: Client
): RoomContextBundle<TPresence, TStorage, TUserMeta, TRoomEvent> {
  let useClient: () => Client;
  if ((client as unknown) !== "__legacy") {
    useClient = () => client;
  } else {
    useClient = _useClient;
  }

  const RoomContext = React.createContext<Room<
    TPresence,
    TStorage,
    TUserMeta,
    TRoomEvent
  > | null>(null);

  function RoomProvider(props: RoomProviderProps<TPresence, TStorage>) {
    const {
      id: roomId,
      initialPresence,
      initialStorage,
      defaultPresence, // Will get removed in 0.18
      defaultStorageRoot, // Will get removed in 0.18
    } = props;

    if (process.env.NODE_ENV !== "production") {
      if (roomId == null) {
        throw new Error(
          "RoomProvider id property is required. For more information: https://liveblocks.io/docs/errors/liveblocks-react/RoomProvider-id-property-is-required"
        );
      }
      if (typeof roomId !== "string") {
        throw new Error("RoomProvider id property should be a string.");
      }
    }

    errorIf(
      defaultPresence,
      "RoomProvider's `defaultPresence` prop will be removed in @liveblocks/react 0.18. Please use `initialPresence` instead. For more info, see https://bit.ly/3Niy5aP"
    );
    errorIf(
      defaultStorageRoot,
      "RoomProvider's `defaultStorageRoot` prop will be removed in @liveblocks/react 0.18. Please use `initialStorage` instead. For more info, see https://bit.ly/3Niy5aP"
    );

    const _client = useClient();

    // Note: We'll hold on to the initial value given here, and ignore any
    // changes to this argument in subsequent renders
    const frozen = useInitial({
      initialPresence,
      initialStorage,
      defaultPresence, // Will get removed in 0.18
      defaultStorageRoot, // Will get removed in 0.18
    });

    const [room, setRoom] = React.useState<
      Room<TPresence, TStorage, TUserMeta, TRoomEvent>
    >(() =>
      _client.enter(roomId, {
        initialPresence,
        initialStorage,
        defaultPresence, // Will get removed in 0.18
        defaultStorageRoot, // Will get removed in 0.18
        DO_NOT_USE_withoutConnecting: typeof window === "undefined",
      } as RoomInitializers<TPresence, TStorage>)
    );

    React.useEffect(() => {
      setRoom(
        _client.enter(roomId, {
          initialPresence: frozen.initialPresence,
          initialStorage: frozen.initialStorage,
          defaultPresence: frozen.defaultPresence, // Will get removed in 0.18
          defaultStorageRoot: frozen.defaultStorageRoot, // Will get removed in 0.18
          DO_NOT_USE_withoutConnecting: typeof window === "undefined",
        } as RoomInitializers<TPresence, TStorage>)
      );

      return () => {
        _client.leave(roomId);
      };
    }, [_client, roomId, frozen]);

    return (
      <RoomContext.Provider value={room}>{props.children}</RoomContext.Provider>
    );
  }

  function useRoom(): Room<TPresence, TStorage, TUserMeta, TRoomEvent> {
    const room = React.useContext(RoomContext);
    if (room == null) {
      throw new Error("RoomProvider is missing from the react tree");
    }
    return room;
  }

  function useMyPresence(): [
    TPresence,
    (overrides: Partial<TPresence>, options?: { addToHistory: boolean }) => void
  ] {
    const room = useRoom();
    const presence = room.getPresence();
    const rerender = useRerender();

    React.useEffect(() => {
      const unsubscribe = room.subscribe("my-presence", rerender);
      return () => {
        unsubscribe();
      };
    }, [room, rerender]);

    const setPresence = React.useCallback(
      (overrides: Partial<TPresence>, options?: { addToHistory: boolean }) =>
        room.updatePresence(overrides, options),
      [room]
    );

    return [presence, setPresence];
  }

  function useUpdateMyPresence(): (
    overrides: Partial<TPresence>,
    options?: { addToHistory: boolean }
  ) => void {
    const room = useRoom();

    return React.useCallback(
      (overrides: Partial<TPresence>, options?: { addToHistory: boolean }) => {
        room.updatePresence(overrides, options);
      },
      [room]
    );
  }

  function useOthers(): Others<TPresence, TUserMeta> {
    const room = useRoom();
    const rerender = useRerender();

    React.useEffect(() => {
      const unsubscribe = room.subscribe("others", rerender);
      return () => {
        unsubscribe();
      };
    }, [room, rerender]);

    return room.getOthers();
  }

  function useBroadcastEvent(): (
    event: TRoomEvent,
    options?: BroadcastOptions
  ) => void {
    const room = useRoom();

    return React.useCallback(
      (
        event: TRoomEvent,
        options: BroadcastOptions = { shouldQueueEventIfNotReady: false }
      ) => {
        room.broadcastEvent(event, options);
      },
      [room]
    );
  }

  function useErrorListener(callback: (err: Error) => void): void {
    const room = useRoom();
    const savedCallback = React.useRef(callback);

    React.useEffect(() => {
      savedCallback.current = callback;
    });

    React.useEffect(() => {
      const listener = (e: Error) => savedCallback.current(e);

      const unsubscribe = room.subscribe("error", listener);
      return () => {
        unsubscribe();
      };
    }, [room]);
  }

  function useEventListener(
    callback: (eventData: { connectionId: number; event: TRoomEvent }) => void
  ): void {
    const room = useRoom();
    const savedCallback = React.useRef(callback);

    React.useEffect(() => {
      savedCallback.current = callback;
    });

    React.useEffect(() => {
      const listener = (eventData: {
        connectionId: number;
        event: TRoomEvent;
      }) => {
        savedCallback.current(eventData);
      };

      const unsubscribe = room.subscribe("event", listener);
      return () => {
        unsubscribe();
      };
    }, [room]);
  }

  function useSelf(): User<TPresence, TUserMeta> | null {
    const room = useRoom();
    const rerender = useRerender();

    React.useEffect(() => {
      const unsubscribePresence = room.subscribe("my-presence", rerender);
      const unsubscribeConnection = room.subscribe("connection", rerender);

      return () => {
        unsubscribePresence();
        unsubscribeConnection();
      };
    }, [room, rerender]);

    return room.getSelf();
  }

  function useStorageRoot(): [root: LiveObject<TStorage> | null] {
    const room = useRoom();
    const [root, setState] = React.useState<LiveObject<TStorage> | null>(null);

    React.useEffect(() => {
      let didCancel = false;

      async function fetchStorage() {
        const storage = await room.getStorage();
        if (!didCancel) {
          setState(storage.root);
        }
      }

      fetchStorage();

      return () => {
        didCancel = true;
      };
    }, [room]);

    return [root];
  }

  function useStorage(): [root: LiveObject<TStorage> | null] {
    deprecate(
      "In the upcoming 0.18 version, the name `useStorage()` is going to be repurposed for a new hook. Please use `useStorageRoot()` instead to keep the current behavior."
    );
    return useStorageRoot();
  }

  function useMap_deprecated<TKey extends string, TValue extends Lson>(
    key: string
  ): LiveMap<TKey, TValue> | null;
  function useMap_deprecated<TKey extends string, TValue extends Lson>(
    key: string,
    entries: readonly (readonly [TKey, TValue])[] | null
  ): LiveMap<TKey, TValue> | null;
  function useMap_deprecated<TKey extends string, TValue extends Lson>(
    key: string,
    entries?: readonly (readonly [TKey, TValue])[] | null | undefined
  ): LiveMap<TKey, TValue> | null {
    errorIf(
      entries,
      `Support for initializing entries in useMap() directly will be removed in @liveblocks/react 0.18.

Instead, please initialize this data where you set up your RoomProvider:

    const initialStorage = () => ({
      ${JSON.stringify(key)}: new LiveMap(...),
      ...
    });

    <RoomProvider initialStorage={initialStorage}>
      ...
    </RoomProvider>

Please see https://bit.ly/3Niy5aP for details.`
    );
    const value = useStorageValue(key, new LiveMap(entries ?? undefined));
    //                                 ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    //                                 NOTE: This param is scheduled for removal in 0.18
    if (value.status === "ok") {
      return value.value;
    } else {
      errorIf(
        value.status === "notfound",
        `Key ${JSON.stringify(
          key
        )} was not found in Storage. Starting with 0.18, useMap() will no longer automatically create this key.

Instead, please initialize your storage where you set up your RoomProvider:

    import { LiveMap } from "@liveblocks/client";

    const initialStorage = () => ({
      ${JSON.stringify(key)}: new LiveMap(...),
      ...
    });

    <RoomProvider initialStorage={initialStorage}>
      ...
    </RoomProvider>

Please see https://bit.ly/3Niy5aP for details.`
      );
      return null;
    }
  }

  function useList_deprecated<TValue extends Lson>(
    key: string
  ): LiveList<TValue> | null;
  function useList_deprecated<TValue extends Lson>(
    key: string,
    items: TValue[]
  ): LiveList<TValue> | null;
  function useList_deprecated<TValue extends Lson>(
    key: string,
    items?: TValue[] | undefined
  ): LiveList<TValue> | null {
    errorIf(
      items,
      `Support for initializing items in useList() directly will be removed in @liveblocks/react 0.18.

Instead, please initialize this data where you set up your RoomProvider:

    import { LiveList } from "@liveblocks/client";

    const initialStorage = () => ({
      ${JSON.stringify(key)}: new LiveList(...),
      ...
    });

    <RoomProvider initialStorage={initialStorage}>
      ...
    </RoomProvider>

Please see https://bit.ly/3Niy5aP for details.`
    );
    const value = useStorageValue<LiveList<TValue>>(key, new LiveList(items));
    //                                                   ^^^^^^^^^^^^^^^^^^^
    //                                                   NOTE: This param is scheduled for removal in 0.18
    if (value.status === "ok") {
      return value.value;
    } else {
      errorIf(
        value.status === "notfound",
        `Key ${JSON.stringify(
          key
        )} was not found in Storage. Starting with 0.18, useList() will no longer automatically create this key.

Instead, please initialize your storage where you set up your RoomProvider:

    import { LiveList } from "@liveblocks/client";

    const initialStorage = () => ({
      ${JSON.stringify(key)}: new LiveList(...),
      ...
    });

    <RoomProvider initialStorage={initialStorage}>
      ...
    </RoomProvider>

Please see https://bit.ly/3Niy5aP for details.`
      );
      return null;
    }
  }

  function useObject_deprecated<TData extends LsonObject>(
    key: string
  ): LiveObject<TData> | null;
  function useObject_deprecated<TData extends LsonObject>(
    key: string,
    initialData: TData
  ): LiveObject<TData> | null;
  function useObject_deprecated<TData extends LsonObject>(
    key: string,
    initialData?: TData
  ): LiveObject<TData> | null {
    errorIf(
      initialData,
      `Support for initializing data in useObject() directly will be removed in @liveblocks/react 0.18.

Instead, please initialize this data where you set up your RoomProvider:

    import { LiveObject } from "@liveblocks/client";

    const initialStorage = () => ({
      ${JSON.stringify(key)}: new LiveObject(...),
      ...
    });

    <RoomProvider initialStorage={initialStorage}>
      ...
    </RoomProvider>

Please see https://bit.ly/3Niy5aP for details.`
    );
    const value = useStorageValue(key, new LiveObject(initialData));
    //                                 ^^^^^^^^^^^^^^^^^^^^^^^^^^^
    //                                 NOTE: This param is scheduled for removal in 0.18
    if (value.status === "ok") {
      return value.value;
    } else {
      errorIf(
        value.status === "notfound",
        `Key ${JSON.stringify(
          key
        )} was not found in Storage. Starting with 0.18, useObject() will no longer automatically create this key.

Instead, please initialize your storage where you set up your RoomProvider:

    import { LiveObject } from "@liveblocks/client";

    const initialStorage = () => ({
      ${JSON.stringify(key)}: new LiveObject(...),
      ...
    });

    <RoomProvider initialStorage={initialStorage}>
      ...
    </RoomProvider>

Please see https://bit.ly/3Niy5aP for details.`
      );
      return null;
    }
  }

  function useList<TKey extends Extract<keyof TStorage, string>>(
    key: TKey
  ): TStorage[TKey] | null {
    return useList_deprecated(key) as unknown as TStorage[TKey];
  }

  function useMap<TKey extends Extract<keyof TStorage, string>>(
    key: TKey
  ): TStorage[TKey] | null {
    return useMap_deprecated(key) as unknown as TStorage[TKey];
  }

  function useObject<TKey extends Extract<keyof TStorage, string>>(
    key: TKey
  ): TStorage[TKey] | null {
    return useObject_deprecated(key) as unknown as TStorage[TKey];
  }

  function useHistory(): History {
    return useRoom().history;
  }

  function useUndo(): () => void {
    return useHistory().undo;
  }

  function useRedo(): () => void {
    return useHistory().redo;
  }

  function useCanUndo(): boolean {
    const room = useRoom();
    const [canUndo, setCanUndo] = React.useState(room.history.canUndo);

    React.useEffect(() => {
      const unsubscribe = room.subscribe("history", ({ canUndo }) =>
        setCanUndo(canUndo)
      );
      return () => {
        unsubscribe();
      };
    }, [room]);

    return canUndo;
  }

  function useCanRedo(): boolean {
    const room = useRoom();
    const [canRedo, setCanRedo] = React.useState(room.history.canRedo);

    React.useEffect(() => {
      const unsubscribe = room.subscribe("history", ({ canRedo }) =>
        setCanRedo(canRedo)
      );
      return () => {
        unsubscribe();
      };
    }, [room]);

    return canRedo;
  }

  function useBatch(): (callback: () => void) => void {
    return useRoom().batch;
  }

  function useStorageValue<T extends Lson>(
    key: string,
    //   ^^^^^^
    //   FIXME: Generalize to `keyof TStorage`?
    initialValue: T
  ): LookupResult<T> {
    const room = useRoom();
    const [root] = useStorageRoot();
    const rerender = useRerender();

    // Note: We'll hold on to the initial value given here, and ignore any
    // changes to this argument in subsequent renders
    const frozenInitialValue = useInitial(initialValue);

    React.useEffect(() => {
      if (root == null) {
        return;
      }

      let liveValue: T | undefined = root.get(key) as T | undefined;

      if (liveValue == null) {
        liveValue = frozenInitialValue;
        root.set(key, liveValue as unknown as TStorage[string]);
        //                      ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ FIXME
      }

      function onRootChange() {
        const newCrdt = root!.get(key) as T | undefined;
        if (newCrdt !== liveValue) {
          unsubscribeCrdt();
          liveValue = newCrdt;
          unsubscribeCrdt = room.subscribe(
            liveValue as any /* AbstractCrdt */, // TODO: This is hiding a bug! If `liveValue` happens to be the string `"event"` this actually subscribes an event handler!
            rerender
          );
          rerender();
        }
      }

      let unsubscribeCrdt = room.subscribe(
        liveValue as any /* AbstractCrdt */, // TODO: This is hiding a bug! If `liveValue` happens to be the string `"event"` this actually subscribes an event handler!
        rerender
      );
      const unsubscribeRoot = room.subscribe(
        root as any /* AbstractCrdt */, // TODO: This is hiding a bug! If `liveValue` happens to be the string `"event"` this actually subscribes an event handler!
        onRootChange
      );

      rerender();

      return () => {
        unsubscribeRoot();
        unsubscribeCrdt();
      };
    }, [root, room, key, frozenInitialValue, rerender]);

    if (root == null) {
      return { status: "loading" };
    } else {
      const value = root.get(key) as T | undefined;
      if (value == null) {
        return { status: "notfound" };
      } else {
        return { status: "ok", value };
      }
    }
  }

  return {
    RoomProvider,
    useBatch,
    useBroadcastEvent,
    useCanRedo,
    useCanUndo,
    useErrorListener,
    useEventListener,
    useHistory,
    useList,
    useMap,
    useMyPresence,
    useObject,
    useOthers,
    useRedo,
    useRoom,
    useSelf,
    useStorageRoot,
    useStorage,
    useUndo,
    useUpdateMyPresence,

    // You normally don't need to directly interact with the RoomContext, but
    // it can be necessary if you're building an advanced app where you need to
    // set up a context bridge between two React renderers.
    RoomContext,

    useList_deprecated,
    useMap_deprecated,
    useObject_deprecated,
  };
}
