export interface MedalClip {
	contentTitle: string;
	tags: string[];
	contentShareUrl: string;
	contentUploadedAt: number;
	contentUrl: string;
	thumbnailUrl: string;
	views: number;
	category: {
		categoryName: string;
		icon: string;
		slug: string;
	};
	subgame?: {
		id: string;
		name: string;
		iconUrl: string;
	};
	poster: {
		displayName: string;
		thumbnail: string;
		userName: string;
	};
}
