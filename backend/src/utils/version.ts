interface DockerTag {
    name: string;
}

interface DockerResponse {
    results: DockerTag[];
}

type VersionCheckResult = {
    isLatest: boolean;
    latestVersion: string;
    latestDigest: string;
    currentDigest: string;
};

export async function checkIfLatestVersion(): Promise<VersionCheckResult> {
    const currentVersion = process.env.APP_VERSION;
    if (!currentVersion) {
        throw new Error('Current version is not defined');
    }
    const repo = 'cellules/mail';
    const baseUrl = `https://hub.docker.com/v2/repositories/${repo}/tags`;

    const fetchTagDigest = async (tag: string): Promise<string> => {
        const res = await fetch(`${baseUrl}/${tag}`);
        if (!res.ok) throw new Error(`Failed to fetch tag ${tag}`);
        const json = await res.json();
        return json.images[0].digest;
    };

    const fetchAllTags = async (): Promise<{ name: string; digest: string }[]> => {
        const res = await fetch(`${baseUrl}?page_size=100`);
        if (!res.ok) throw new Error('Failed to fetch tags');
        const json = await res.json();
        return json.results.map((tag: any) => ({
            name: tag.name,
            digest: tag.images[0].digest,
        }));
    };

    const [latestDigest, currentDigest, allTags] = await Promise.all([
        fetchTagDigest('latest'),
        fetchTagDigest(currentVersion),
        fetchAllTags(),
    ]);

    const tagMatchingLatest = allTags.find(tag => tag.digest === latestDigest && tag.name !== 'latest');
    const latestVersion = tagMatchingLatest?.name || 'unknown';

    return {
        isLatest: currentVersion === latestVersion,
        latestVersion,
        latestDigest,
        currentDigest,
    };
}
