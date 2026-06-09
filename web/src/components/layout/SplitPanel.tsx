import type { ReactNode } from 'react';
import styles from './SplitPanel.module.css';

export function SplitPanel({ children }: { children: ReactNode }) {
  return (
    <div className={styles.wrap}>
      <section className={styles.brand}>
        <div className={styles.logo}>
          <span className={styles.logoDot} aria-hidden="true" />
          BRAND
        </div>
        <div>
          <p className={styles.quote}>&ldquo;Powering the tools that power the team.&rdquo;</p>
          <p className={styles.copy}>
            Lorem ipsum dolor sit amet consectetur. Elit purus nam gravida porttitor nibh urna sit
            ornare a. Proin dolor morbi id ornare aenean.
          </p>
        </div>
      </section>
      <section className={styles.formSide}>
        <div className={styles.formInner}>{children}</div>
      </section>
    </div>
  );
}
