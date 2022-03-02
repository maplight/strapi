import React, { useEffect, useRef, useState } from 'react';
import { useIntl } from 'react-intl';
import { Helmet } from 'react-helmet';
import { useQuery } from 'react-query';
import {
  AnErrorOccurred,
  CheckPagePermissions,
  useFocusWhenNavigate,
  useTracking,
  LoadingIndicatorPage,
  useNotification,
} from '@strapi/helper-plugin';
import { Grid, GridItem } from '@strapi/design-system/Grid';
import { Layout, HeaderLayout, ContentLayout, ActionLayout } from '@strapi/design-system/Layout';
import { Main } from '@strapi/design-system/Main';
import { Searchbar } from '@strapi/design-system/Searchbar';
import { useNotifyAT } from '@strapi/design-system/LiveRegions';
import FlexSearch from 'flexsearch';
import adminPermissions from '../../permissions';
import PluginCard from './components/PluginCard';
import { fetchAppInformation } from './utils/api';
import useFetchInstalledPlugins from '../../hooks/useFetchInstalledPlugins';
import useFetchMarketplacePlugins from '../../hooks/useFetchMarketplacePlugins';

const MarketPlacePage = () => {
  const { formatMessage } = useIntl();
  const { trackUsage } = useTracking();
  const { notifyStatus } = useNotifyAT();
  const trackUsageRef = useRef(trackUsage);
  const toggleNotification = useNotification();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const flexIndex = FlexSearch.Index({
    profile: 'speed',
    tokenize: 'forward',
  });
  const [searchIndex, setSearchIndex] = useState(flexIndex);

  useFocusWhenNavigate();

  const marketplaceTitle = formatMessage({
    id: 'admin.pages.MarketPlacePage.title',
    defaultMessage: 'Marketplace',
  });

  const notifyMarketplaceLoad = () => {
    notifyStatus(
      formatMessage(
        {
          id: 'app.utils.notify.data-loaded',
          defaultMessage: 'The {target} has loaded',
        },
        { target: marketplaceTitle }
      )
    );
  };

  const { status: marketplacePluginsStatus, data: marketplacePluginsResponse } =
    useFetchMarketplacePlugins(notifyMarketplaceLoad);

  const { status: installedPluginsStatus, data: installedPluginsResponse } =
    useFetchInstalledPlugins();

  const { data: appInfoResponse, status: appInfoStatus } = useQuery(
    'app-information',
    fetchAppInformation,
    {
      onError: () => {
        toggleNotification({
          type: 'warning',
          message: { id: 'notification.error', defaultMessage: 'An error occured' },
        });
      },
    }
  );

  const isLoading = [marketplacePluginsStatus, installedPluginsStatus, appInfoStatus].includes(
    'loading'
  );

  const hasFailed = [marketplacePluginsStatus, installedPluginsStatus, appInfoStatus].includes(
    'error'
  );

  const handleInputChange = (input) => {
    setSearchQuery(input);
    setSearchResults(searchIndex.search(input));
  };

  useEffect(() => {
    if (isLoading) return;
    marketplacePluginsResponse.data.forEach((plugin) => {
      const fieldsToIndex = JSON.stringify({
        name: plugin.attributes.name,
        description: plugin.attributes.description,
      });

      setSearchIndex(searchIndex.add(plugin.id, fieldsToIndex));
    });
  }, [isLoading, marketplacePluginsResponse, searchIndex]);

  useEffect(() => {
    trackUsageRef.current('didGoToMarketplace');
  }, []);

  if (hasFailed) {
    return (
      <Layout>
        <AnErrorOccurred />
      </Layout>
    );
  }

  if (isLoading) {
    return (
      <Layout>
        <Main aria-busy>
          <LoadingIndicatorPage />
        </Main>
      </Layout>
    );
  }

  const searchResultPlugins = searchResults.map((result) =>
    marketplacePluginsResponse.data.find((plugin) => plugin.id === result)
  );

  const displayedPlugins = searchResultPlugins.length
    ? searchResultPlugins
    : marketplacePluginsResponse.data;

  const installedPluginNames = installedPluginsResponse.plugins.map((plugin) => plugin.packageName);

  return (
    <Layout>
      <Main>
        <Helmet
          title={formatMessage({
            id: 'admin.pages.MarketPlacePage.helmet',
            defaultMessage: 'Marketplace - Plugins',
          })}
        />
        <HeaderLayout
          title={formatMessage({
            id: 'admin.pages.MarketPlacePage.title',
            defaultMessage: 'Marketplace',
          })}
          subtitle={formatMessage({
            id: 'admin.pages.MarketPlacePage.subtitle',
            defaultMessage: 'Get more out of Strapi',
          })}
        />
        <ActionLayout
          startActions={
            <Searchbar
              name="searchbar"
              onClear={() => handleInputChange('')}
              value={searchQuery}
              onChange={(e) => handleInputChange(e.target.value)}
              clearLabel="Clearing the plugin search"
              placeholder="Search"
            >
              Searching for a plugin
            </Searchbar>
          }
        />
        <ContentLayout>
          <Grid gap={4}>
            {displayedPlugins.map((plugin) => (
              <GridItem col={4} s={6} xs={12} style={{ height: '100%' }} key={plugin.id}>
                <PluginCard
                  plugin={plugin}
                  installedPluginNames={installedPluginNames}
                  useYarn={appInfoResponse.data.useYarn}
                />
              </GridItem>
            ))}
          </Grid>
        </ContentLayout>
      </Main>
    </Layout>
  );
};

const ProtectedMarketPlace = () => (
  <CheckPagePermissions permissions={adminPermissions.marketplace.main}>
    <MarketPlacePage />
  </CheckPagePermissions>
);

export { MarketPlacePage };
export default ProtectedMarketPlace;
