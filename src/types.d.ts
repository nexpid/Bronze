export interface MedalClip {
	contentId: string;
	contentTitle: string;
	tags: string[];
	contentShareUrl?: string;
	contentUploadedAt: number;
	contentUrl: string;
	contentUrlHls: string;
	thumbnailUrl: string;
	views: number;
	sourceWidth: number;
	sourceHeight: number;
	category: {
		categoryName: string;
		icon: string;
		slug: string;
	};
	subgame?: {
		id: string;
		name: string;
		iconUrl: string;
		joinUrl: string;
		metadata: {
			joinUrl?: string;
		};
	};
	poster: {
		displayName: string;
		thumbnail: string;
		userName: string;
	};
	videoLengthSeconds: number;
}
