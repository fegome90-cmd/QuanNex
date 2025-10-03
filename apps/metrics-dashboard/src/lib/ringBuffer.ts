export class Ring<T> {
  private buf: T[] = [];
  constructor(private cap = 200) {}
  push(v: T) {
    this.buf.push(v);
    if (this.buf.length > this.cap) this.buf.shift();
  }
  values() {
    return this.buf.slice();
  }
}
