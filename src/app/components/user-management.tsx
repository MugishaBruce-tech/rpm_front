import React, { useState, useEffect } from 'react';
import { useIntl } from 'react-intl';
import { toast } from 'sonner';
import { userService } from '../services/userService';
import { usePrimaryColor } from '../hooks/usePrimaryColor';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';
import { Skeleton } from './ui/skeleton';
import { UserPlus, Save, AlertCircle } from 'lucide-react';

export function UserManagement() {
  const intl = useIntl();
  const primaryColor = usePrimaryColor();
  const [profiles, setProfiles] = useState<any[]>([]);
  const [legalEntities, setLegalEntities] = useState<any[]>([]);
  const [regions, setRegions] = useState<string[]>([]);
  const [businessPartnerTypes, setBusinessPartnerTypes] = useState<string[]>([]);
  const [customerChannels, setCustomerChannels] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchingMetadata, setFetchingMetadata] = useState(true);

  const currentUser = JSON.parse(localStorage.getItem('rpm-tracker-auth-user') || localStorage.getItem('user') || '{}');
  const userRole = currentUser?.role || '';

  const [formData, setFormData] = useState({
    business_partner_name: '',
    user_ad: '',
    region: userRole === 'DDM' ? currentUser.region : '',
    business_partner_type: 'customer',
    customer_channel: '',
    legal_entity_key: '',
    profil_id: '',
  });

  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        setFetchingMetadata(true);
        const metadata = await userService.getMetadata();
        
        // Filter profiles based on requirements:
        // MD_AGENT/OPCO_USER can create: OPCO_USER, MD_AGENT, DDM
        // DDM can only create: SUB_D (which is a business partner)
        let filteredProfiles = metadata.profils || [];
        const internalProfileCodes = ['OPCO_USER', 'MD_AGENT', 'DDM'];
        
        if (userRole === 'MD_AGENT' || userRole === 'OPCO_USER' || userRole === 'ADMIN') {
          filteredProfiles = filteredProfiles.filter((p: any) => 
            internalProfileCodes.includes(p.CODE_PROFIL)
          );
        } else if (userRole === 'DDM') {
          filteredProfiles = filteredProfiles.filter((p: any) => 
            ['SUB_D'].includes(p.CODE_PROFIL)
          );
        }

        setProfiles(filteredProfiles);
        setLegalEntities(metadata.legalEntities || []);
        setRegions(metadata.regions || []);
        setBusinessPartnerTypes(metadata.businessPartnerTypes || []);
        const channels = metadata.customerChannels || [];
        setCustomerChannels(channels);
        
        // Update defaults
        if (channels.length > 0 && !formData.customer_channel) {
          setFormData(prev => ({ ...prev, customer_channel: channels[0] }));
        }
        if (filteredProfiles.length > 0 && !formData.profil_id) {
          setFormData(prev => ({ ...prev, profil_id: filteredProfiles[0].PROFIL_ID?.toString() }));
        }

      } catch (err: any) {
        console.error('Failed to fetch metadata:', err);
      } finally {
        setFetchingMetadata(false);
      }
    };
    fetchMetadata();
  }, [userRole]);

  // Determine if region select should be shown
  // Only when the selected profile is DDM OR if current user is DDM (creating SUB_D)
  const selectedProfile = profiles.find(p => p.PROFIL_ID?.toString() === formData.profil_id || String(p.PROFIL_ID) === formData.profil_id);
  const showRegionSelect = (selectedProfile?.CODE_PROFIL === 'DDM') && (userRole !== 'DDM');
  const isCreatingInternal = ['OPCO_USER', 'MD_AGENT', 'DDM'].includes(selectedProfile?.CODE_PROFIL);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // If profile is not DDM and current user is not DDM, clear region
      const dataToSubmit = { ...formData };
      if (!showRegionSelect && userRole !== 'DDM') {
        dataToSubmit.region = '';
      }

      const result = await userService.createUser(dataToSubmit);
      toast.success(intl.formatMessage({ id: 'users.create_success' }), {
        description: result?.password ? `${intl.formatMessage({ id: 'users.password_label' })}: ${result.password}` : '',
        duration: 8000
      });
      console.log('User created successfully. Generated password:', result.password);
      
      // Reset form
      setFormData({
        business_partner_name: '',
        user_ad: '',
        region: userRole === 'DDM' ? currentUser.region : '',
        business_partner_type: 'customer',
        customer_channel: '',
        legal_entity_key: '',
        profil_id: '',
      });
    } catch (err: any) {
      toast.error(err.message || intl.formatMessage({ id: 'users.create_failed' }));
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  if (fetchingMetadata) {
    return (
      <div className="p-6 max-w-2xl mx-auto space-y-6 min-h-[calc(100vh-120px)] flex flex-col">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-10 w-full" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-10 w-full" />
              </div>
            </div>
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6 min-h-[calc(100vh-120px)] flex flex-col">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            {intl.formatMessage({ id: 'users.create_title' })}
          </CardTitle>
          <CardDescription>
            {intl.formatMessage({ id: 'users.create_desc' })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="business_partner_name">{intl.formatMessage({ id: 'users.form.full_name' })}</Label>
              <Input
                id="business_partner_name"
                value={formData.business_partner_name}
                onChange={handleInputChange}
                required
                placeholder={intl.formatMessage({ id: 'users.form.name_placeholder' })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="user_ad">{intl.formatMessage({ id: 'users.form.email_ad' })}</Label>
              <Input
                id="user_ad"
                type="email"
                value={formData.user_ad}
                onChange={handleInputChange}
                required
                placeholder="user@example.com"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {showRegionSelect && (
                <div className="space-y-2">
                  <Label htmlFor="region">{intl.formatMessage({ id: 'users.form.region' })}</Label>
                  <Select
                    value={formData.region}
                    onValueChange={(val) => setFormData((prev) => ({ ...prev, region: val }))}
                  >
                    <SelectTrigger id="region">
                      <SelectValue placeholder={intl.formatMessage({ id: 'users.form.select_region' })} />
                    </SelectTrigger>
                    <SelectContent>
                      {regions.map((reg) => (
                        <SelectItem key={reg} value={reg}>{reg}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {selectedProfile?.CODE_PROFIL === 'SUB_D' && (
                <>
                <div className="space-y-2">
                  <Label htmlFor="business_partner_type">{intl.formatMessage({ id: 'users.form.type' })}</Label>
                  <Select
                    value={formData.business_partner_type}
                    onValueChange={(val) => setFormData((prev) => ({ ...prev, business_partner_type: val }))}
                  >
                    <SelectTrigger id="business_partner_type">
                      <SelectValue placeholder={intl.formatMessage({ id: 'users.form.select_type' })} />
                    </SelectTrigger>
                    <SelectContent>
                      {businessPartnerTypes.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type && type.length > 0 ? type.charAt(0).toUpperCase() + type.slice(1) : type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customer_channel">{intl.formatMessage({ id: 'loans.table.channel' })}</Label>
                  <Select
                    value={formData.customer_channel}
                    onValueChange={(val) => setFormData((prev) => ({ ...prev, customer_channel: val }))}
                  >
                    <SelectTrigger id="customer_channel">
                      <SelectValue placeholder={intl.formatMessage({ id: 'loans.table.channel' })} />
                    </SelectTrigger>
                    <SelectContent>
                      {customerChannels.map(ch => (
                        <SelectItem key={ch} value={ch}>
                          {ch && ch.length > 0 ? ch.charAt(0).toUpperCase() + ch.slice(1) : ch}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                </>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="legal_entity_key">{intl.formatMessage({ id: 'users.form.legal_entity' })}</Label>
                <Select
                  value={formData.legal_entity_key}
                  onValueChange={(val) => setFormData((prev) => ({ ...prev, legal_entity_key: val }))}
                >
                  <SelectTrigger id="legal_entity_key">
                    <SelectValue placeholder={intl.formatMessage({ id: 'users.form.select_legal_entity' })} />
                  </SelectTrigger>
                  <SelectContent>
                    {legalEntities.map((le) => (
                      <SelectItem key={le.legal_entity_key} value={le.legal_entity_key?.toString?.() || String(le.legal_entity_key)}>
                        {le.legal_entity_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="profil_id">{intl.formatMessage({ id: 'users.form.profile' })}</Label>
                <Select
                  value={formData.profil_id}
                  onValueChange={(val) => setFormData((prev) => ({ ...prev, profil_id: val }))}
                >
                  <SelectTrigger id="profil_id">
                    <SelectValue placeholder={intl.formatMessage({ id: 'users.form.select_profile' })} />
                  </SelectTrigger>
                  <SelectContent>
                    {profiles.map((p) => (
                      <SelectItem key={p.PROFIL_ID} value={p.PROFIL_ID?.toString?.() || String(p.PROFIL_ID)}>
                        {p.CODE_PROFIL}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={loading} style={{ backgroundColor: primaryColor }}>
              {loading ? intl.formatMessage({ id: 'users.creating' }) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  {intl.formatMessage({ id: 'users.create_btn' })}
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
      {/* FOOTER */}
      <div className="flex justify-center items-center text-[7px] font-bold text-slate-400 uppercase tracking-[0.2em] px-1 mt-auto pt-10 opacity-40">
        <span>{intl.formatMessage({ id: 'opco.copyright' })}</span>
      </div>
    </div>
  );
}
