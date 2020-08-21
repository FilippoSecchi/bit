import React from 'react';
import { ChangeLogPage } from './ui/change-log-page';
import { Section } from '@teambit/component';
import styles from './changelog.module.scss';

export class ChangelogSection implements Section {
  route = {
    path: '~changelog',
    children: <ChangeLogPage className={styles.changeLog} />,
  };
  navigationLink = {
    href: '~changelog',
    children: 'History',
  };
}