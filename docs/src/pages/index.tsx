import React from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';

export default function Home(): JSX.Element {
  return (
    <Layout title="Agentic Pipelines" description="Safer, more controlled AI automation">
      <main style={{padding: '4rem 1rem'}}>
        <section style={{textAlign: 'center', maxWidth: 800, margin: '0 auto'}}>
          <h1 style={{fontSize: '3rem', marginBottom: '1rem'}}>Agentic Pipelines</h1>
          <p style={{fontSize: '1.25rem', color: 'var(--ifm-color-emphasis-700)'}}>
            Sandbox AI inside pipelines with clear permissions and gates.
          </p>
          <div style={{marginTop: '2rem'}}>
            <Link className="button button--primary button--lg" to="/docs/intro">
              Get Started
            </Link>
          </div>
        </section>
      </main>
    </Layout>
  );
}
