// PrintQ Shared Live Queue Service & Engine

export type QueueItemStatus = "waiting" | "printing" | "ready" | "completed" | "cancelled";

export type QueueOrder = {
  id: string;
  token: string;
  fileName: string;
  totalPages: number;
  copies: number;
  colour: boolean;
  paperStock?: string;
  createdAt: number;
  startedPrintingAt?: number;
  completedAt?: number;
  status: QueueItemStatus;
  userEmail?: string;
  userName?: string;
  isCurrentUser?: boolean;
};

const QUEUE_STORAGE_KEY = "printq_live_queue_v2";

// Printer spec: Single shared shop printer
export const PRINTER_SPEED_BW_MS = 2500; 
export const PRINTER_SPEED_COLOUR_MS = 4500;
export const PRINTER_STARTUP_OVERHEAD_MS = 3000;

export function calculateOrderPrintDurationMs(order: { totalPages: number; copies: number; colour: boolean; paperStock?: string }): number {
  const pages = Math.max(1, order.totalPages) * Math.max(1, order.copies);
  // Realistic campus turnaround duration in minutes: base minutes + colour extra + queue buffer
  const baseMinutes = pages * 0.5;
  const colourExtra = order.colour ? pages * 0.3 : 0;
  const isSpecialPaper = /premium|glossy|matte|photo/i.test(order.paperStock || '');
  const paperExtra = isSpecialPaper ? pages * 0.2 : 0;
  const queueBuffer = 3;
  const totalMinutes = Math.max(5, Math.round(baseMinutes + colourExtra + paperExtra + queueBuffer));
  return totalMinutes * 60 * 1000;
}

// Initial demo baseline queue if storage is empty
function getInitialQueue(): QueueOrder[] {
  return [];
}

class PrintQueueManager {
  private listeners: Set<(queue: QueueOrder[]) => void> = new Set();
  private timer: number | null = null;

  constructor() {
    if (typeof window !== "undefined") {
      window.addEventListener("storage", (e) => {
        if (e.key === QUEUE_STORAGE_KEY) {
          this.notifyListeners();
        }
      });
      this.startEngine();
    }
  }

  public getQueue(): QueueOrder[] {
    if (typeof window === "undefined") return [];
    try {
      const data = window.localStorage.getItem(QUEUE_STORAGE_KEY);
      if (!data) {
        const initial = getInitialQueue();
        this.saveQueue(initial);
        return initial;
      }
      return JSON.parse(data) as QueueOrder[];
    } catch {
      return getInitialQueue();
    }
  }

  public saveQueue(queue: QueueOrder[]): void {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue));
      this.notifyListeners();
    } catch {
      // Storage unavailable
    }
  }

  public subscribe(callback: (queue: QueueOrder[]) => void): () => void {
    this.listeners.add(callback);
    callback(this.getQueue());
    return () => {
      this.listeners.delete(callback);
    };
  }

  private notifyListeners() {
    const queue = this.getQueue();
    this.listeners.forEach((cb) => cb(queue));
  }

  public addOrder(order: {
    id: string;
    token: string;
    fileName: string;
    totalPages: number;
    copies: number;
    colour: boolean;
    paperStock?: string;
    userEmail?: string;
    userName?: string;
  }): QueueOrder {
    const queue = this.getQueue();
    
    const existing = queue.find((q) => q.id === order.id || q.token === order.token);
    if (existing) {
      return existing;
    }

    const newOrder: QueueOrder = {
      ...order,
      createdAt: Date.now(),
      status: "waiting",
      isCurrentUser: true,
    };

    queue.push(newOrder);
    this.saveQueue(queue);
    this.processQueue();
    return newOrder;
  }

  public updateOrderStatus(orderId: string, status: QueueItemStatus): void {
    const queue = this.getQueue();
    const target = queue.find((q) => q.id === orderId);
    if (target) {
      target.status = status;
      if (status === "printing" && !target.startedPrintingAt) {
        target.startedPrintingAt = Date.now();
      }
      if (status === "completed" || status === "ready") {
        target.completedAt = Date.now();
      }
      this.saveQueue(queue);
    }
  }

  // FIFO Processing Engine
  public processQueue(): void {
    const queue = this.getQueue();
    const now = Date.now();

    // Check currently printing order
    const currentlyPrinting = queue.find((q) => q.status === "printing");

    if (currentlyPrinting) {
      const duration = calculateOrderPrintDurationMs(currentlyPrinting);
      const printStartTime = currentlyPrinting.startedPrintingAt || now;
      const elapsed = now - printStartTime;

      if (elapsed >= duration) {
        // Current print finished! Update to ready for pickup
        currentlyPrinting.status = "ready";
        currentlyPrinting.completedAt = now;
        this.saveQueue(queue);
        // Next order in waiting queue can start
        this.processQueue();
        return;
      }
    } else {
      // Printer is idle! Find earliest waiting order (FIFO)
      const waitingOrders = queue.filter((q) => q.status === "waiting");
      if (waitingOrders.length > 0) {
        const nextInLine = waitingOrders[0];
        nextInLine.status = "printing";
        nextInLine.startedPrintingAt = now;
        this.saveQueue(queue);
      }
    }
  }

  private startEngine(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = window.setInterval(() => {
      this.processQueue();
      this.notifyListeners();
    }, 1000);
  }

  public getNowServing(): { token: string; status: string; fileName?: string } | null {
    const queue = this.getQueue();
    // 1. Prioritize currently printing order
    const printing = queue.find((q) => q.status === "printing");
    if (printing) {
      return {
        token: printing.token,
        status: "Printing",
        fileName: printing.fileName,
      };
    }
    // 2. Next check ready for collection
    const ready = queue.find((q) => q.status === "ready");
    if (ready) {
      return {
        token: ready.token,
        status: "Ready for Pickup",
        fileName: ready.fileName,
      };
    }
    // 3. Fallback to earliest waiting order
    const waiting = queue.find((q) => q.status === "waiting");
    if (waiting) {
      return {
        token: waiting.token,
        status: "Waiting in Queue",
        fileName: waiting.fileName,
      };
    }
    return null;
  }

  public setNowServingToken(token: string): void {
    const queue = this.getQueue();
    const now = Date.now();
    // Set matching token to printing if waiting
    const target = queue.find((q) => q.token.toUpperCase() === token.toUpperCase());
    if (target) {
      target.status = "printing";
      target.startedPrintingAt = now;
      this.saveQueue(queue);
    }
  }

  public getQueueMetricsForToken(token?: string) {
    const queue = this.getQueue();
    const now = Date.now();

    const currentlyPrinting = queue.find((q) => q.status === "printing");

    let currentlyPrintingRemainingMs = 0;
    if (currentlyPrinting) {
      const duration = calculateOrderPrintDurationMs(currentlyPrinting);
      const printStartTime = currentlyPrinting.startedPrintingAt || now;
      const elapsed = now - printStartTime;
      currentlyPrintingRemainingMs = Math.max(0, duration - elapsed);
    }

    const waitingOrders = queue.filter((q) => q.status === "waiting");

    let ordersAhead = 0;
    let estimatedWaitMs = currentlyPrintingRemainingMs;
    let userOrder: QueueOrder | undefined = undefined;

    if (token) {
      userOrder = queue.find((q) => q.token.toUpperCase() === token.toUpperCase());
    }

    if (userOrder) {
      if (userOrder.status === "printing") {
        ordersAhead = 0;
        const duration = calculateOrderPrintDurationMs(userOrder);
        const elapsed = now - (userOrder.startedPrintingAt || now);
        estimatedWaitMs = Math.max(0, duration - elapsed);
      } else if (userOrder.status === "waiting") {
        ordersAhead = currentlyPrinting ? 1 : 0;
        for (const order of waitingOrders) {
          if (order.id === userOrder.id || order.token === userOrder.token) {
            break;
          }
          ordersAhead += 1;
          estimatedWaitMs += calculateOrderPrintDurationMs(order);
        }
      } else {
        ordersAhead = 0;
        estimatedWaitMs = 0;
      }
    } else {
      ordersAhead = (currentlyPrinting ? 1 : 0) + waitingOrders.length;
      for (const order of waitingOrders) {
        estimatedWaitMs += calculateOrderPrintDurationMs(order);
      }
    }

    const waitTotalSeconds = Math.ceil(estimatedWaitMs / 1000);
    const waitMinutes = Math.max(1, Math.round(waitTotalSeconds / 60));
    const waitFormatted = waitTotalSeconds < 60
      ? "Under 1 minute"
      : waitMinutes === 1
      ? "~1 minute"
      : `~${waitMinutes} minutes`;

    return {
      currentlyPrinting: currentlyPrinting ? {
        token: currentlyPrinting.token,
        fileName: currentlyPrinting.fileName,
        details: `${currentlyPrinting.totalPages} pgs · ${currentlyPrinting.colour ? "Colour" : "B&W"}`,
      } : null,
      ordersAhead,
      estimatedWaitMs,
      waitFormatted,
      waitMinutes,
      userOrderStatus: userOrder?.status || (token ? "waiting" : null),
      userOrder,
      isPrinterActive: Boolean(currentlyPrinting),
      totalQueueCount: (currentlyPrinting ? 1 : 0) + waitingOrders.length,
    };
  }
}

export const printQueueManager = new PrintQueueManager();