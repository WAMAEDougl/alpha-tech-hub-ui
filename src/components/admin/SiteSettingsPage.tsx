import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useSiteConfig } from "@/contexts/SiteConfigContext";

const siteSettingsSchema = z.object({
  companyName: z.string().min(1, "Company name is required"),
  logoLight: z.string().optional(),
  logoDark: z.string().optional(),
  mapLat: z.coerce.number().min(-90).max(90),
  mapLng: z.coerce.number().min(-180).max(180),
  phone: z.string().min(1, "Phone number is required"),
  whatsappNumber: z.string().min(1, "WhatsApp number is required"),
});

type SiteSettingsFormValues = z.infer<typeof siteSettingsSchema>;

const SiteSettingsPage = () => {
  const { config, setConfig } = useSiteConfig();

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<SiteSettingsFormValues>({
    resolver: zodResolver(siteSettingsSchema),
    defaultValues: {
      companyName: config.companyName,
      logoLight: config.logoLight,
      logoDark: config.logoDark,
      mapLat: config.mapLat,
      mapLng: config.mapLng,
      phone: config.phone,
      whatsappNumber: config.whatsappNumber,
    },
  });

  function handleFileChange(
    field: "logoLight" | "logoDark",
    e: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setValue(field, reader.result as string);
    };
    reader.readAsDataURL(file);
  }

  function onSubmit(values: SiteSettingsFormValues) {
    setConfig({
      companyName: values.companyName,
      logoLight: values.logoLight ?? config.logoLight,
      logoDark: values.logoDark ?? config.logoDark,
      mapLat: values.mapLat,
      mapLng: values.mapLng,
      phone: values.phone,
      whatsappNumber: values.whatsappNumber,
    });
    toast.success("Site settings saved successfully.");
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-heading font-bold">Site Settings</h1>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Branding</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="companyName">Company Name</Label>
              <Input id="companyName" {...register("companyName")} />
              {errors.companyName && (
                <p className="text-sm text-destructive">{errors.companyName.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="logoLight">Logo (Light Mode)</Label>
              <Input
                id="logoLight"
                type="file"
                accept="image/*"
                onChange={(e) => handleFileChange("logoLight", e)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="logoDark">Logo (Dark Mode)</Label>
              <Input
                id="logoDark"
                type="file"
                accept="image/*"
                onChange={(e) => handleFileChange("logoDark", e)}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Location</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="mapLat">Map Latitude</Label>
                <Input id="mapLat" type="number" step="any" {...register("mapLat")} />
                {errors.mapLat && (
                  <p className="text-sm text-destructive">{errors.mapLat.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="mapLng">Map Longitude</Label>
                <Input id="mapLng" type="number" step="any" {...register("mapLng")} />
                {errors.mapLng && (
                  <p className="text-sm text-destructive">{errors.mapLng.message}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Contact</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="phone">Phone Number</Label>
              <Input id="phone" {...register("phone")} />
              {errors.phone && (
                <p className="text-sm text-destructive">{errors.phone.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="whatsappNumber">WhatsApp Number</Label>
              <Input id="whatsappNumber" {...register("whatsappNumber")} />
              {errors.whatsappNumber && (
                <p className="text-sm text-destructive">{errors.whatsappNumber.message}</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Button type="submit" disabled={isSubmitting}>
          Save Settings
        </Button>
      </form>
    </div>
  );
};

export default SiteSettingsPage;
