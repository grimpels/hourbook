export type Entry = {
	id: number;
	day: string;
	start_min: number;
	end_min: number;
	description: string;
	client_id: number | null;
	project_id: number | null;
	client_name: string | null;
	project_name: string | null;
	client_color: string | null;
	project_color: string | null;
};

export type Client = {
	id: number;
	name: string;
	color: string | null;
	doc_body: string | null;
	doc_header: string | null;
	doc_footer: string | null;
	doc_email: string | null;
};
export type Project = {
	id: number;
	name: string;
	client_id: number | null;
	client_name: string | null;
	color: string | null;
	doc_body: string | null;
	doc_header: string | null;
	doc_footer: string | null;
	doc_email: string | null;
};

/** O activitate scrisa deja, cu clientul si proiectul de la ultima folosire. */
export type Activity = {
	description: string;
	client_name: string | null;
	project_name: string | null;
};

export type Timer = {
	started_at: number;
	description: string;
	client: string;
	project: string;
};
