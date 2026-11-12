/** A created public listing must be closed if connecting/publishing fails. */
export async function startBroadcast<T extends { id: string }>(
  create: () => Promise<T>,
  connect: (room: T) => Promise<void>,
  end: (id: string) => Promise<unknown>,
): Promise<T> {
  const room = await create();
  try { await connect(room); }
  catch (error) {
    try { await end(room.id); }
    catch { throw new Error("Connection failed and the room could not be closed. Reopen your room and use End broadcast, or retry when connected."); }
    throw error;
  }
  return room;
}
