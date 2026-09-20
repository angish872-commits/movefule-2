package com.movefuel.mufil2.ui.screens.bar

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun BAR005ProductFoundScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "BAR_005",
        title = "Product Found",
        subtitle = "Barcode and nutrition-label capture with fallback entry.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.BAR_006,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.BAR_004,
        onNavigate = onNavigate,
    ) {
            MFStatusBanner("Product found", "Trusted product information is ready for review.")
            MFMacroBars(.64f,.36f,.52f,.41f)
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun BAR005ProductFoundScreenPreview() {
    MoveFuelTheme { BAR005ProductFoundScreen {} }
}
