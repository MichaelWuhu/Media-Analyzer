import { useState } from "react";
import type { FormEvent } from "react";
import { Loader } from "@aws-amplify/ui-react";
import "./App.css";
import { Amplify } from "aws-amplify";
import type { Schema } from "../amplify/data/resource";
import { generateClient } from "aws-amplify/data";
import outputs from "../amplify_outputs.json";
import "@aws-amplify/ui-react/styles.css";
import { Authenticator, useAuthenticator } from "@aws-amplify/ui-react";

Amplify.configure(outputs);

const amplifyClient = generateClient<Schema>({
    authMode: "userPool",
});

function App() {
    const { signOut, user } = useAuthenticator();
    const [result, setResult] = useState<string>("");
    const [loading, setLoading] = useState(false);
    const [fileName, setFileName] = useState<string | null>(null);

    const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setLoading(true);
        setResult("");

        try {
            const formData = new FormData(event.currentTarget);

            // This still uses the `ingredients` field so your backend keeps working
            const text = formData.get("ingredients")?.toString() || "";

            const { data, errors } = await amplifyClient.queries.askBedrock({
                ingredients: [text],
            });

            if (!errors) {
                setResult(data?.body || "No data returned");
            } else {
                console.error(errors);
                setResult("An error occurred. Check the console for details.");
            }
        } catch (e) {
            alert(`An error occurred: ${e}`);
        } finally {
            setLoading(false);
        }
    };

    const onFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        setFileName(file.name);

        // Later: upload to S3 / trigger backend with Transcribe + Rekognition
    };

    return (
        <div className="app-root">
            <header className="app-header">
                <div className="app-header-left">
                    <span className="app-logo">🎧</span>
                    <div className="app-title-group">
                        <h1 className="app-title">Media Analyzer</h1>
                        <p className="app-subtitle">
                            Analyze a short clip using AWS Transcribe, Rekognition, and
                            Generative AI.
                        </p>
                    </div>
                </div>
                <div className="app-header-right">
                    <span className="app-badge">
                        Signed in as {user?.username ?? "unknown"}
                    </span>
                    <button className="signout-button" onClick={signOut}>
                        Sign out
                    </button>
                </div>
            </header>

            <main className="app-main">
                <section className="app-card">
                    <form onSubmit={onSubmit} className="form">
                        <div className="section">
                            <h2 className="section-title">1. Upload media (optional)</h2>
                            <p className="section-help">
                                Start with a short audio / video clip. For now this is just
                                visual — you’ll hook it to S3 / Lambda later.
                            </p>
                            <label className="file-drop">
                                <input
                                    type="file"
                                    accept="audio/*,video/*"
                                    className="file-input"
                                    onChange={onFileChange}
                                />
                                <div className="file-drop-inner">
                                    <p className="file-drop-text">
                                        {fileName
                                            ? `Selected: ${fileName}`
                                            : "Click to choose a file or drag it here"}
                                    </p>
                                    <p className="file-drop-hint">
                                        Keep it short (~30 seconds) for easy testing.
                                    </p>
                                </div>
                            </label>
                        </div>

                        <div className="section">
                            <h2 className="section-title">2. Describe the clip</h2>
                            <p className="section-help">
                                Describe what’s happening, or paste a quick transcript / notes.
                                (Behind the scenes this is sent as the “ingredients” field for
                                your existing Bedrock function.)
                            </p>
                            <textarea
                                id="ingredients"
                                name="ingredients"
                                className="text-input"
                                placeholder="Example: Two speakers discussing a project demo. Speaker 1 introduces the app, Speaker 2 explains how it uses AWS services..."
                                rows={4}
                            />
                        </div>

                        <div className="actions">
                            <button
                                type="submit"
                                className="primary-button"
                                disabled={loading}
                            >
                                {loading ? "Analyzing..." : "Run AI Analysis"}
                            </button>
                            <p className="actions-hint">
                                This calls your Amplify backend, which invokes Amazon Bedrock
                                (Claude) via <code>askBedrock</code>.
                            </p>
                        </div>
                    </form>
                </section>

                <section className="results-card">
                    <h2 className="results-title">AI Output</h2>
                    <p className="results-caption">
                        For now this is whatever Claude returns from your existing recipe
                        prompt. Later you can update the prompt to summarize transcripts or
                        label speakers.
                    </p>

                    <div className="results-body">
                        {loading && (
                            <div className="loader-row">
                                <Loader size="large" />
                                <span className="loader-text">Analyzing media…</span>
                            </div>
                        )}

                        {!loading && !result && (
                            <p className="results-placeholder">
                                No output yet. Describe a clip and click{" "}
                                <strong>Run AI Analysis</strong> to see the response here.
                            </p>
                        )}

                        {!loading && result && (
                            <pre className="results-pre">{result}</pre>
                        )}
                    </div>
                </section>
            </main>
        </div>
    );
}

export default App;
