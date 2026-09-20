package com.movefuel.mufil2.ui.screens.bil

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun BIL007PurchaseResultScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "BIL_007",
        title = "Purchase Result",
        subtitle = "Subscription and purchase states.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.BIL_008,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.BIL_006,
        onNavigate = onNavigate,
    ) {
            MFStatusBanner("Purchase result","Success, pending, or failure is shown explicitly.")
            MFListItem("Entitlement","Pending verification","Refresh")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun BIL007PurchaseResultScreenPreview() {
    MoveFuelTheme { BIL007PurchaseResultScreen {} }
}
