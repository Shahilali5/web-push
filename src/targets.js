// target: "all" | "tag:vip" | "user:123"
function sqlFor(target) {
  if (!target || target === 'all') return ['', []];
  const [type, ...rest] = target.split(':'); const val = rest.join(':');
  if (type === 'tag') return [' AND JSON_CONTAINS(tags, JSON_QUOTE(?))', [val]];
  if (type === 'user') return [' AND user_id = ?', [val]];
  return ['', []];
}
const roomFor = target => (!target || target === 'all' ? 'all' : target); // rooms: all | tag:x | user:x
module.exports = { sqlFor, roomFor };
