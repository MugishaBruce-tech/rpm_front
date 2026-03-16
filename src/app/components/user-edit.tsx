import React, { useState, useEffect } from 'react';
import { useIntl } from 'react-intl';
import { useParams, useNavigate } from 'react-router';
import { userService } from '../services/userService';
import { usePrimaryColor } from '../hooks/usePrimaryColor';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Skeleton } from './ui/skeleton';
import { Save, AlertCircle, ArrowLeft } from 'lucide-react';

export function UserEdit() {
  const intl = useIntl();
  const { id } = useParams();
  const navigate = useNavigate();
  const primaryColor = usePrimaryColor();
  const [profiles, setProfiles] = useState<any[]>([]);
  const [legalEntities, setLegalEntities] = useState<any[]>([]);
  const [regions, setRegions] = useState<string[]>([]);
  const [businessPartnerTypes, setBusinessPartnerTypes] = useState<string[]>([]);
  const [statuses, setStatuses] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    business_partner_name: '',
    user_ad: '',
    region: 'North',
    business_partner_type: 'customer',
    customer_channel: 'distributor',
    legal_entity_key: '',
    profil_id: '',
    business_partner_status: 'active',
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setFetching(true);
        const [metadata, usersResponse] = await Promise.all([
          userService.getMetadata(),
          userService.getUsers({ limit: 1000 }), // Get all users for edit
        ]);

        setProfiles(metadata.profils || []);
        setLegalEntities(metadata.legalEntities || []);
        setRegions(metadata.regions || []);
        setBusinessPartnerTypes(metadata.businessPartnerTypes || []);
        setStatuses(metadata.statuses || []);

        if (id) {
          const user = usersResponse.users.find((u: any) => u.business_partner_key === parseInt(id));
          if (user) {
            setFormData({
              business_partner_name: user.business_partner_name,
              user_ad: user.user_ad,
              region: user.region || 'North',
              business_partner_type: user.business_partner_type || 'customer',
              customer_channel: user.customer_channel || 'distributor',
              legal_entity_key: user.legal_entity_key?.toString() || '',
              profil_id: user.profil_id?.toString() || '',
              business_partner_status: user.business_partner_status || 'active',
            });
          } else {
            setError(intl.formatMessage({ id: 'users.not_found' }));
          }
        }
      } catch (err: any) {
        console.error('Failed to fetch data:', err);
        setError(intl.formatMessage({ id: 'users.load_failed' }));
      } finally {
        setFetching(false);
      }
    };
    fetchData();
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await userService.updateUser(id!, formData);
      setSuccess(intl.formatMessage({ id: 'users.update_success' }));
      setTimeout(() => {
        navigate('/settings/users');
      }, 1500);
    } catch (err: any) {
      setError(err.message || intl.formatMessage({ id: 'users.update_failed' }));
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  if (fetching) {
    return (
      <div className="p-6 max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <Skeleton className="h-8 w-40" />
        </div>
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
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/settings/users')}
          className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </button>
        <h1 className="text-2xl font-bold text-slate-900">{intl.formatMessage({ id: 'users.edit_title' })}</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{intl.formatMessage({ id: 'users.update_info' })}</CardTitle>
          <CardDescription>
            {intl.formatMessage({ id: 'users.edit_desc' })}
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
              <Label htmlFor="user_ad">{intl.formatMessage({ id: 'users.form.email_read_only' })}</Label>
              <Input
                id="user_ad"
                type="email"
                value={formData.user_ad}
                disabled
                placeholder="user@example.com"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

            <div className="space-y-2">
              <Label htmlFor="business_partner_status">{intl.formatMessage({ id: 'users.table.status' })}</Label>
              <Select
                value={formData.business_partner_status}
                onValueChange={(val) => setFormData((prev) => ({ ...prev, business_partner_status: val }))}
              >
                <SelectTrigger id="business_partner_status">
                  <SelectValue placeholder={intl.formatMessage({ id: 'users.all_status' })} />
                </SelectTrigger>
                <SelectContent>
                  {statuses.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status && status.length > 0 ? status.charAt(0).toUpperCase() + status.slice(1) : status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-sm">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}

            {success && (
              <div className="p-3 text-sm text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-sm">
                <div className="font-medium">{success}</div>
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading} style={{ backgroundColor: primaryColor }}>
              {loading ? intl.formatMessage({ id: 'users.updating' }) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  {intl.formatMessage({ id: 'users.update_btn' })}
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
