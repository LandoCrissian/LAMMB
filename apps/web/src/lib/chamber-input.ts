// One owner per control. Ending an unrelated pointer never releases another thumb.
export class PointerOwner {
  id: number | null = null;
  claim(id: number) {
    if (this.id !== null) return false;
    this.id = id;
    return true;
  }
  release(id: number) {
    if (this.id !== id) return false;
    this.id = null;
    return true;
  }
  clear() {
    this.id = null;
  }
}
