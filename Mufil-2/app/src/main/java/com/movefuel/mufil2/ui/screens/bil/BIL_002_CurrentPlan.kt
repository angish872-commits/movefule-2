package com.movefuel.mufil2.ui.screens.bil

import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.movefuel.mufil2.ui.components.*
import com.movefuel.mufil2.ui.design.MoveFuelColors
import com.movefuel.mufil2.ui.design.MoveFuelTheme
import com.movefuel.mufil2.ui.navigation.MoveFuelRoute

@Composable
fun BIL002CurrentPlanScreen(onNavigate: (MoveFuelRoute) -> Unit) {
    MFScreenFrame(
        id = "BIL_002",
        title = "Current Plan",
        subtitle = "Subscription and purchase states.",
        primaryLabel = "Continue",
        primaryRoute = MoveFuelRoute.BIL_003,
        secondaryLabel = "Back",
        secondaryRoute = MoveFuelRoute.BIL_001,
        onNavigate = onNavigate,
    ) {
            MFStatusBanner("Current plan","Development / configured plan")
            MFListItem("Manage plan","Compare available plans","Open")
            MFListItem("Platform billing","Managed by store","Open")
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0E130F, widthDp = 390, heightDp = 844)
@Composable
private fun BIL002CurrentPlanScreenPreview() {
    MoveFuelTheme { BIL002CurrentPlanScreen {} }
}
