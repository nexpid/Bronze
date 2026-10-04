// minimal types
declare module "mux.js" {
	export interface TransmuxerSegment {
		data: Uint8Array;
		initSegment: Uint8Array;
	}

	class Transmuxer {
		constructor(options?: {
			keepOriginalTimestamps?: boolean;
			remux?: boolean;
		});
		on(event: "data", listener: (segment: TransmuxerSegment) => void): void;
		push(data: Uint8Array): void;
		flush(): void;
		dispose(): void;
	}

	export const mp4: {
		Transmuxer: typeof Transmuxer;
	};

	export default { mp4 };
}
